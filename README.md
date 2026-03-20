# Eleventy Albums

A system for creating photo albums in Eleventy.

## Albums

An album is a markdown file with the normal trappings of a post, like a date
and a title, except that an album must contain a boolean ""album" flag marked
as true.

An album also:

 * has a key, that allows photos and other albums (but not both) to be
   associated with it, by using the key as a parent field.
 * has a permalink, the same as the slug of the post file.

Albums act as containers for other albums or images (but not both), by
stamping the albums key as the parent field in the target post.

## Images

An image is a markdown file with an image field, as well as the normal
trappings of a post, like a date, alt text, and an optional title.

It must belong to an album, by setting the parent field of the image.

Its permalink is the key of the album, plus a hash of the content of the
image.  The album forms part of the URL so that the same image in different
albums can be considered different images.  In other words, an image's album
is part of its definition.

## Adding an Album

 * Create the album file, with a unique key that will appear as the URL.
 * Create the image folder next to the album file.  Call it whatever you
   want, but "<album slug>-images" isn't a bad name.
 * Create the image files in the image folder.
 * Create a json file in the image folder, defining the parent (album) of
   the images
