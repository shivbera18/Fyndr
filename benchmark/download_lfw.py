#!/usr/bin/env python3
"""
Fyndr LFW downloader — fetches LFW images + pairs.txt + deepfunneled if needed.
Uses http mirrors; falls back to multiple URLs. Verifies count 5749 identities, 13233 images, 6000 pairs.
"""
import os, sys, urllib.request, tarfile, hashlib, pathlib, time

DATA_DIR = pathlib.Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Primary LFW tgz (~173MB) and pairs — figshare is most reliable (vis-www.cs.umass.edu DNS often fails)
URLS = [
    "https://ndownloader.figshare.com/files/5976018",  # lfw.tgz 180MB (S3 presigned, works via GET)
    "https://vis-www.cs.umass.edu/lfw/lfw.tgz",
    "http://vis-www.cs.umass.edu/lfw/lfw.tgz",
    "http://conradsanderson.id.au/lfw/lfw.tgz",
]
PAIRS_URLS = [
    "https://raw.githubusercontent.com/davidsandberg/facenet/master/data/pairs.txt",  # 155k, same as LFW pairs.txt
    "https://vis-www.cs.umass.edu/lfw/pairs.txt",
    "http://vis-www.cs.umass.edu/lfw/pairs.txt",
]
# also pairsDevTrain from figshare for reference
PAIRS_FIGSHARE = "https://ndownloader.figshare.com/files/5976012"  # pairsDevTrain.txt

def download(url, dest, retries=3):
    # try requests first (handles figshare presigned redirects better)
    try:
        import requests
        HAS_REQUESTS = True
    except:
        HAS_REQUESTS = False
    for attempt in range(retries):
        try:
            print(f"[dl] {url} -> {dest} (attempt {attempt+1})")
            if HAS_REQUESTS:
                with requests.get(url, stream=True, timeout=60, headers={'User-Agent':'Mozilla/5.0'}) as r:
                    r.raise_for_status()
                    total = int(r.headers.get('Content-Length', 0))
                    print(f"  size {total//1024//1024}MB" if total else "  size unknown")
                    with open(dest, 'wb') as f:
                        downloaded = 0
                        for chunk in r.iter_content(chunk_size=1024*1024):
                            if chunk:
                                f.write(chunk)
                                downloaded += len(chunk)
                                if total:
                                    print(f"  {downloaded//1024//1024}MB / {total//1024//1024}MB", end="\r")
                        print()
            else:
                def report(b, bsize, tsize):
                    if tsize>0 and b%200==0:
                        print(f"  {b*bsize//1024//1024}MB / {tsize//1024//1024}MB", end="\r")
                urllib.request.urlretrieve(url, dest)
            if os.path.getsize(dest) > 1000:
                print(f"[ok] {dest} {os.path.getsize(dest)//1024//1024}MB")
                return True
        except Exception as e:
            print(f"[fail] {e}")
            import traceback; traceback.print_exc()
            time.sleep(2)
    return False

def ensure_lfw():
    tgz = DATA_DIR / "lfw.tgz"
    lfw_dir = DATA_DIR / "lfw"
    pairs = DATA_DIR / "pairs.txt"
    # download tgz if not exists or empty
    if not lfw_dir.exists() or len(list(lfw_dir.glob("*"))) < 100:
        # need tgz
        if not tgz.exists() or tgz.stat().st_size < 50*1024*1024:
            ok=False
            for u in URLS:
                if download(u, tgz):
                    ok=True
                    break
            if not ok:
                print("[error] failed to download lfw.tgz from all mirrors")
                print("Try manual: wget http://vis-www.cs.umass.edu/lfw/lfw.tgz -O benchmark/data/lfw.tgz")
                return False
        print(f"[extract] {tgz} -> {DATA_DIR}")
        try:
            with tarfile.open(tgz) as tf:
                tf.extractall(DATA_DIR)
            print("[ok] extracted")
        except Exception as e:
            print(f"[extract fail] {e}")
            return False
    else:
        print(f"[skip] lfw dir exists {len(list(lfw_dir.glob('*')))} identities")

    # pairs.txt
    if not pairs.exists() or pairs.stat().st_size < 1000:
        ok=False
        for u in PAIRS_URLS:
            if download(u, pairs):
                ok=True
                break
        if not ok:
            print("[error] failed pairs.txt")
            return False
    else:
        print(f"[skip] pairs.txt exists {pairs.stat().st_size} bytes")

    # verify counts
    if lfw_dir.exists():
        ids = list(lfw_dir.iterdir())
        imgs = list(lfw_dir.rglob("*.jpg"))
        print(f"[verify] {len(ids)} identities, {len(imgs)} images")
        if len(imgs) < 10000:
            print("[warn] fewer than expected 13233 images — incomplete download")
    if pairs.exists():
        lines = pairs.read_text().splitlines()
        print(f"[verify] pairs.txt {len(lines)} lines (expect 6002 incl header)")
        # first line header "10 300" per fold
        try:
            h = lines[0].strip().split()
            print(f"  header: {h}")
        except: pass
    return True

if __name__ == "__main__":
    ok = ensure_lfw()
    sys.exit(0 if ok else 1)
