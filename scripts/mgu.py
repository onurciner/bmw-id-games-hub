#!/usr/bin/env python3
"""Local preparation only. Never connects to the car or installs on it."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path
from store_package import build_store_delivery

ROOT = Path(__file__).resolve().parents[1]
LOCK = json.loads((ROOT / 'mgu/upstream.json').read_text())
KIT = ROOT / '.local/idrive7-apps'
DIST = ROOT / 'dist'
APP = 'roi_game_hub'


def run(args, cwd=ROOT):
    subprocess.run([str(a) for a in args], cwd=cwd, check=True)


def kit_ready():
    if not (KIT / '.git').is_dir():
        raise RuntimeError('Kit yok. Önce: npm run mgu:prepare')
    revision = subprocess.check_output(['git', '-C', str(KIT), 'rev-parse', 'HEAD'], text=True).strip()
    if revision != LOCK['commit']:
        raise RuntimeError('Kit sürümü mgu/upstream.json ile eşleşmiyor; otomatik değiştirilmedi.')
    changes = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD', '--', 'kit', 'deploy'], cwd=KIT, text=True).splitlines()
    if any(name != 'kit/tools/build.py' for name in changes):
        raise RuntimeError('Kit dosyaları yerel olarak değiştirilmiş; üzerine yazılmadı.')
    digest = hashlib.sha256((KIT / 'kit/tools/build.py').read_bytes()).hexdigest()
    if digest not in [LOCK['storeBuild']['originalSha256'], LOCK['storeBuild']['patchedSha256']]:
        raise RuntimeError('Kit derleyicisi doğrulanmış sürümle eşleşmiyor.')


def prepare():
    if not KIT.exists():
        KIT.parent.mkdir(parents=True, exist_ok=True)
        run(['git', 'clone', '--depth', '1', LOCK['repository'], KIT])
        revision = subprocess.check_output(['git', '-C', str(KIT), 'rev-parse', 'HEAD'], text=True).strip()
        if revision != LOCK['commit']:
            run(['git', 'fetch', '--depth', '1', 'origin', LOCK['commit']], KIT)
            run(['git', 'checkout', '--detach', LOCK['commit']], KIT)
    kit_ready()
    if hashlib.sha256((KIT / 'kit/tools/build.py').read_bytes()).hexdigest() == LOCK['storeBuild']['originalSha256']:
        run(['git', 'apply', ROOT / 'mgu' / LOCK['storeBuild']['patch']], KIT)
        kit_ready()
    target = KIT / 'apps' / APP
    marker = target / '.roi-game-hub-managed'
    if target.exists() and not marker.exists():
        raise RuntimeError(str(target) + ' başka dosyalar içeriyor; üzerine yazılmadı.')
    target.mkdir(parents=True, exist_ok=True)
    marker.write_text('Managed by ROI Game Hub; edit this project\'s mgu/ sources instead.\n')
    for name in LOCK['appFiles']:
        shutil.copy2(ROOT / 'mgu' / name, target / name)
    print('MGU kaynakları hazır: ' + str(target), flush=True)


def doctor():
    missing = []
    for name in ['node', 'python3', 'git']:
        found = shutil.which(name)
        print(('OK    ' if found else 'EKSİK ') + name)
        if not found:
            missing.append(name)
    try:
        kit_ready()
        print('OK    idrive7-apps @ ' + LOCK['commit'][:12])
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print('EKSİK kit: ' + str(error))
        missing.append('kit')
    print('OK    Mac SDK gerekmiyor — MGU Store kurulumda araçtan tamamlar')
    print('Araç bağlantısı ve araç üzerindeki testler: yapılmadı')
    return 2 if missing else 0


def checksums(files):
    DIST.mkdir(exist_ok=True)
    for file in files:
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        file.with_name(file.name + '.sha256').write_text(digest + '  ' + file.name + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['doctor', 'prepare', 'build', 'package'])
    args = parser.parse_args()
    if args.command == 'doctor':
        return doctor()
    prepare()
    if args.command == 'prepare':
        return 0
    run([sys.executable, KIT / 'kit/tools/build.py', '--sdk-on-unit', APP], KIT)
    files = build_store_delivery(ROOT, KIT, LOCK, include_usb=args.command == 'package')
    checksums(files)
    if args.command == 'package':
        source_repo = DIST / 'ROI-Game-Hub-MGU-USB' / 'mgu-repo'
        target_repo = ROOT / 'publish' / 'mgu-repo'
        shutil.copytree(source_repo, target_repo, dirs_exist_ok=True)
    print('Yerel paketler: ' + ', '.join(str(f) for f in files))
    print('MGU Store paketi hazır; SDK kurulumda araçtan alınır. Araca kurulum yapılmadı.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
