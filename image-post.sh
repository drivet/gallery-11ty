#!/bin/bash

show_help() {
    echo "Usage: image-post [options] <image-files>"
    echo "Options:"
    echo "  -h Show help message"
    echo "  -a album key to use (default current folder)"
    echo "  -o output folder"
    echo "  -r src root (default empty)"
    echo "  -e extension (default md)"
    echo "  -i if present, also create an index album file"
    echo "  -k album layout to use (default layouts/album.njk), ignored if -i not used"
    echo "  -t title of album, ignored if -i not used"
    echo "  -f featured image of album, ignored if -i not used"
    echo "  -p parent of album, ignored if -i is not used"
    echo "  -b body of album, ignored if -i not used"
}

album=""
output="."
srcroot=
layout="layouts/photo.njk"
ext="md"
index=
albumlayout="layouts/album.njk"
title=
parent=
body=
featured=
OPTIND=1
while getopts "hs:a:o:r:l:e:ik:t:p:b:f:" opt; do
    case $opt in
        h) show_help; exit 0 ;;
        a) album="$OPTARG" ;;
        o) output="$OPTARG" ;;
        r) srcroot="$OPTARG" ;;
        l) layout="$OPTARG" ;;
        e) ext="$OPTARG" ;;
        i) index="true" ;;
        k) albumlayout="$OPTARG" ;;
        t) title="$OPTARG" ;;
        f) featured="$OPTARG" ;;
        p) parent="$OPTARG" ;;
        b) body="$OPTARG" ;;
        \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
    esac
done

shift $((OPTIND-1))

mkdir -p $output

d=$(date "+%FT%T%z")
for f in "$@"
do
    if [[ -n "$srcroot" ]]; then
        relf="${f#$srcroot}"
    fi
    base=$(basename "$relf")
    bare="${base%.*}" 
    barelow="${bare,,}"
    path="$output/$barelow.$ext"
   
    echo "---" > "$path"
    echo "date: $d" >> "$path"
    echo "layout: \"$layout\"" >> "$path"
    echo "parent: \"$album\"" >> "$path"
    echo "image: \"/$relf\"" >> "$path"
    echo "alt: \"\"" >> "$path"
    echo "---" >> "$path"
done

if ${index}; then
    path="$output/index.$ext"
    echo "---" > $path
    echo "date: $d" >> $path
    if [[ -n "$parent" ]]; then
       echo "parent: \"$parent\"" >> $path 
    fi
    echo "title: \"$title\"" >> $path
    echo "featured: \"/$featured\"" >> $path
    echo "layout: \"$albumlayout\"" >> $path
    echo "key: \"$album\"" >> $path
    echo "---" >> $path
    echo >> $path
    if [[ -n "$body" ]]; then
        echo "$body" >> $path
    fi
fi
