"""Build complete SDK-free OAP and USB catalog artifacts for MGU Store."""
import gzip
import hashlib
import json
import shutil
import subprocess
import tarfile
import zipfile
from pathlib import Path

EPOCH = 1792281600


def run(args, cwd):
    subprocess.run([str(a) for a in args], cwd=cwd, check=True)


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def store_tools(root, lock):
    store = root / '.local/mgu-store'
    pin = lock['store']
    if not store.exists():
        run(['git', 'clone', '--depth', '1', '--filter=blob:none', '--sparse', pin['repository'], store], root)
        revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=store, text=True).strip()
        if revision != pin['commit']:
            run(['git', 'fetch', '--depth', '1', 'origin', pin['commit']], store)
            run(['git', 'checkout', '--detach', pin['commit']], store)
        run(['git', 'sparse-checkout', 'set', 'tools', 'deploy', 'docs', 'release', 'native/mgu-updater', 'native/mgu-render', 'native/mgu-deploy'], store)
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=store, text=True).strip()
    if revision != pin['commit']:
        raise RuntimeError('MGU Store araçlarının sürümü kilit dosyasıyla eşleşmiyor.')
    run(['git', 'diff', '--quiet', 'HEAD', '--', 'tools', 'deploy', 'native/mgu-updater'], store)
    return store


def normalized(member):
    member.uid = member.gid = 0
    member.uname = member.gname = ''
    member.mtime = EPOCH
    member.mode = 0o755 if member.isdir() else 0o644
    member.pax_headers = {}
    return member


def pack_app(stage, artifact):
    with artifact.open('wb') as output, gzip.GzipFile(filename='', fileobj=output, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.USTAR_FORMAT) as tar:
            tar.add(stage, arcname='package', filter=normalized)


def descriptor(file):
    return {'name': file.name, 'size': file.stat().st_size, 'sha256': sha(file), 'url': file.name}


def build_store_delivery(root, kit, lock, include_usb=True):
    store = store_tools(root, lock)
    spec = json.loads((root / 'mgu/app.json').read_text())
    app_id, version = spec['id'], spec['version']
    dist = root / 'dist'
    dist.mkdir(exist_ok=True)
    stage = kit / 'dist' / app_id / 'source'
    if (stage / 'node_modules/oap-sdk').exists():
        raise RuntimeError('Store teslimatı SDK içeremez; --sdk-on-unit ile derleyin.')
    licenses = stage / 'licenses'
    licenses.mkdir(exist_ok=True)
    shutil.copy2(kit / 'LICENSE', licenses / 'idrive7-apps-MIT.txt')
    (licenses / 'NOTICE.txt').write_text(
        'ROI Game Hub uses the idrive7-apps runtime (MIT), revision ' + lock['commit'] + '.\n'
        'https://github.com/cauliflowermossgrape/idrive7-apps\n'
        'Font license texts are included under javascript/kit/fonts/.\n'
        'The BMW oap-sdk is not included. MGU Store supplies it from a stock app on the unit.\n', encoding='utf-8')
    artifact = dist / (app_id + '@' + version + '.tgz')
    pack_app(stage, artifact)
    report = dist / 'mgu-store-validation.json'
    if not include_usb:
        run(['node', root / 'scripts/verify-store.js', store, artifact, report], root)
        return [artifact]

    delivery = dist / 'ROI-Game-Hub-MGU-USB'
    repo = delivery / 'mgu-repo/roi-game-hub'
    repo.mkdir(parents=True, exist_ok=True)
    shutil.copy2(artifact, repo / artifact.name)
    icon = stage / 'rhmiData/variantGroups/Common/images' / (app_id + '_icon.png')
    shutil.copy2(icon, repo / 'roi_game_hub.png')
    components = []
    for source in [store / 'deploy', kit / 'kit/renderd/prebuilt', kit / 'kit/renderd/inputgate/tool']:
        meta = json.loads((source / 'component.json').read_text())
        run(['node', store / 'deploy/hu', 'artifact', source, '--out', repo], root)
        file = repo / (meta['id'] + '@' + meta['version'] + '.tgz')
        component = {key: meta[key] for key in ['id', 'kind', 'version', 'title', 'description', 'mguHmi', 'mguProvides'] if key in meta}
        component.update({'artifact': descriptor(file), 'requires': meta.get('requires', {}), 'uninstallable': meta.get('uninstallable', False)})
        components.append(component)
    required = {c['id']: c['version'] for c in components}
    components.append({
        'id': app_id, 'kind': 'app', 'version': version, 'title': spec['title'],
        'description': spec['description'], 'author': spec['vendor'], 'mguHmi': spec.get('mguHmi', ['ID7']),
        'artifact': descriptor(repo / artifact.name), 'requires': required, 'uninstallable': True,
        'icon': 'roi_game_hub.png', 'iconSha256': sha(repo / 'roi_game_hub.png'),
    })
    catalog = {'schema': 2, 'components': components}
    (repo / 'catalog.json').write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    run(['node', root / 'scripts/verify-store.js', store, artifact, report, repo], root)
    shutil.copy2(report, delivery / report.name)
    license_dir = delivery / 'licenses'
    license_dir.mkdir(exist_ok=True)
    shutil.copy2(store / 'LICENSE', license_dir / 'mgu-store-LICENSE.txt')
    shutil.copy2(kit / 'LICENSE', license_dir / 'idrive7-apps-MIT.txt')
    (license_dir / 'SOURCES.txt').write_text(
        'idrive7-apps: ' + lock['repository'] + '\nCommit: ' + lock['commit'] + '\n'
        'mgu-store: ' + lock['store']['repository'] + '\nCommit: ' + lock['store']['commit'] + '\n'
        'Renderer license texts are also included inside its tool package.\n', encoding='utf-8')
    (delivery / 'KURULUM.txt').write_text(
        'ROI GAME HUB ' + version + ' — MGU / iDrive 7 and 8\n\n'
        'Gereken: Araçta çalışan MGU Store. Mac üzerinde oap-sdk gerekmez.\n'
        '1. Bu klasördeki mgu-repo klasörünü USB belleğin köküne kopyala.\n'
        '2. Araç park halindeyken USB belleği araca tak ve MGU Store’u aç.\n'
        '3. USB kaynakları içindeki ROI Game Hub uygulamasını seç ve Yükle’ye bas.\n'
        '4. Store gerekli deploy tool, renderer ve controller gate paketlerini kurar.\n'
        '5. Store yeniden başlatma isterse tamamla; ardından ROI Game Hub’ı aç.\n\n'
        'SDK kurulum sırasında araçtaki stok BMW uygulamasından tamamlanır.\n'
        'Store kurulu değilse önce MGU Store kurulumu gerekir: https://github.com/robertnisipeanu/mgu-store\n'
        'Kumandayı çevir veya sağa/sola it: seç / hareket; bas: başlat / duraklat.\n'
        'Canlı hız gelmezse oyun kilitli kalır. Araç hareket ederse oyun duraklatılır.\n\n'
        'Gerçek BMW SDK veya araç üzerinde çalıştırma yapılmadı.\n', encoding='utf-8')
    allowed = [repo / 'catalog.json', repo / 'roi_game_hub.png', *[repo / c['artifact']['name'] for c in components],
               delivery / 'KURULUM.txt', delivery / report.name, *sorted(license_dir.iterdir())]
    (delivery / 'SHA256SUMS').write_text(''.join(sha(f) + '  ' + f.relative_to(delivery).as_posix() + '\n' for f in allowed), encoding='utf-8')
    allowed.append(delivery / 'SHA256SUMS')
    archive = dist / ('ROI-Game-Hub-MGU-' + version + '-USB.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as zipped:
        for file in sorted(allowed):
            info = zipfile.ZipInfo(file.relative_to(delivery).as_posix(), (2026, 10, 18, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            zipped.writestr(info, file.read_bytes())
    print('USB teslimatı: ' + str(archive), flush=True)
    return [artifact, archive]
