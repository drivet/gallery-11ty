import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { inspect } from "util";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import _ from 'lodash';
import Image from "@11ty/eleventy-img";
import exifr from 'exifr';
import pluginRss from "@11ty/eleventy-plugin-rss";
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';

dayjs.extend(utc);
dayjs.extend(timezone);

let hashFile = null;
const CACHE_DIR = '.cache/';

function loadCached() {
  if (hashFile !== null) {
    return hashFile;
  }

  const filePath = `${CACHE_DIR}/imghashes.json`;
  if (fs.existsSync(filePath)) {
    const cacheFile = fs.readFileSync(filePath);
    hashFile = JSON.parse(cacheFile);
  } else {
    hashFile = {};
  }
  return hashFile;
}

function saveHashes() {
  const filePath = `${CACHE_DIR}/imghashes.json`;
  const fileContent = JSON.stringify(hashFile, null, 2);
  // create cache folder if it doesnt exist already
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
  }

  fs.writeFileSync(filePath, fileContent);
}

export default async function(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(pluginRss);crypto
  
  eleventyConfig.addCollection("albumsAndImages", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md")
  );

  eleventyConfig.addCollection("albums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.image)
  );

  eleventyConfig.addCollection("leafAlbums", (collection) => {
    const allPosts = collection.getFilteredByGlob("src/albums/**/*.md");
    const allLeafKeys = new Set(allPosts.filter(p => p.data.image).map(p => p.data.parent));
    return allPosts.filter(p => allLeafKeys.has(p.data.key));
  });
  
  eleventyConfig.addCollection("rootAlbums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.parent && !p.data.image)
  );
  
  eleventyConfig.addCollection('entryInfoByKey', (collection) => {
    const allPosts = collection.getFilteredByGlob("src/albums/**/*.md");
    const postDict = {};
    allPosts.forEach(p => {
      if (!(p.data.key in postDict)){
        // first time we see this key, create the entry
        postDict[p.data.key] = {node: p, children: []};
      } else {
        // the key might be in the dict already if p is an album,
        // and we already came across an image from that album.
        postDict[p.data.key].node = p;
      }

      if (p.data.parent) {
        if (!(p.data.parent in postDict)) {
          // first time we've come across this parent
          // we will hopefully come across the actual parent node later,
          // but in the meantime, record the child here
          postDict[p.data.parent] = {node: null, children: [p]};
        } else {
          // we've seen this parent before, add this node to children
          postDict[p.data.parent].children.push(p);
        }
      }
    });
    return postDict;
  });

  eleventyConfig.addFilter("childSummary", (albumKey, entryInfoByKey) => {
    if (!(albumKey in entryInfoByKey)) {
      return "";
    }
    const entryInfo = entryInfoByKey[albumKey];
    if (entryInfo.children.length === 0) {
      return "";
    }
    const itemLabel = entryInfo.children[0].data.image ? "photos" : "albums";
    return `${entryInfo.children.length} ${itemLabel}`;
  });

  eleventyConfig.addFilter("albumChildren", (albumKey, entryInfoByKey) => {
    if (!(albumKey in entryInfoByKey)) {
      return null;
    }
    return entryInfoByKey[albumKey].children;
  });

  eleventyConfig.addFilter("date", d =>
    d ? dayjs(d).tz('America/Montreal').format('MMM D, YYYY, h:mm A Z') : "" );

  eleventyConfig.addFilter('photoContext', (photoKey, parentKey, entryInfoByKey) => {
    const parentInfo = entryInfoByKey[parentKey];
    const imageNodes = parentInfo.children;
    const photoIdx = imageNodes.findIndex(e => e.data.key === photoKey );
    
    let prevUrl;
    if (photoIdx > 0) {
      const prevNavNode = imageNodes[photoIdx-1];
      const prevNode = entryInfoByKey[prevNavNode.data.key].node;
      prevUrl = prevNode.url;
    }

    let nextUrl;
    if ((photoIdx + 1) < imageNodes.length) {
      const nextNavNode = imageNodes[photoIdx + 1];
      const nextNode = entryInfoByKey[nextNavNode.data.key].node;
      nextUrl = nextNode.url;
    }
    return {prevUrl, nextUrl};
  });

  eleventyConfig.addFilter('defaultPhotoTitle', (photoKey, parentKey, entryInfoByKey) => {
    const parentInfo = entryInfoByKey[parentKey];
    const imageNodes = parentInfo.children;
    const photoIdx = imageNodes.findIndex(e => e.data.key === photoKey );
    return `${parentInfo.node.data.title} / ${photoIdx + 1} of ${imageNodes.length}`;
  });

  eleventyConfig.addFilter("cdump", o => inspect(o));
  
  eleventyConfig.addPassthroughCopy({"static": "."});
  eleventyConfig.addPassthroughCopy({
    "node_modules/lucide-static/font": "css/font"
  });

  async function imgUrl(src) {
    const data = await Image("src/"+src, {
      widths: ["auto"],
      formats: ["jpeg"],
      outputDir: "_site/img"
    });
    return data["jpeg"][0].url;
  }
  eleventyConfig.addNunjucksAsyncShortcode("imgUrl", imgUrl);

  async function ogImage(src) {
    const data = await Image("src/"+src, {
      widths: [1200],
      formats: ["jpeg"],
      outputDir: "_site/img"
    });
    return data["jpeg"][0].url;
  }
  eleventyConfig.addNunjucksAsyncShortcode("ogImage", ogImage);

  async function imgShortcode(src, alt, cls, widths) {
    // the src parameter begins with /photo/* which worked when the HTML
    // transform plugin was used, but which doesn't work in this context.
    // We can compensate by tacking on a src/
    const data = await Image("src/" + src, {
      widths: [...widths],
      formats: ["jpeg"],
      outputDir: "_site/img"
    }); 
    
    const allCls = data['jpeg'][0].height > data['jpeg'][0].width ? `${cls} portrait` : cls;
    const attributes = {
      alt,
      class: allCls,
      sizes: "(width < 600px) 480px, 800px",
      loading: "lazy",
      decoding: "async",
    };
    return Image.generateHTML(data, attributes);
  }

  async function largeImage(src, alt, cls) {
    return await imgShortcode(src, alt, cls, [1200]);
  }

  async function mediumImage(src, alt, cls) {
    return await imgShortcode(src, alt, cls, [800]);
  }
  
  async function smallImage(src, alt, cls) {
    return await imgShortcode(src, alt, cls, [480]);
  }
  
  eleventyConfig.addNunjucksAsyncShortcode("smallImage", smallImage);
  eleventyConfig.addNunjucksAsyncShortcode("mediumImage", mediumImage);
  eleventyConfig.addNunjucksAsyncShortcode("largeImage", largeImage);

  async function getPixelHash(imagePath) {
    // Extract raw pixel data only
    const rawBuffer = await sharp(imagePath)
          .raw()
          .toBuffer();

    // Generate a standard SHA-256 hash of the pixel bytes
    const hash = crypto.createHash('sha256').update(rawBuffer).digest('hex');
    return hash;
  }

  eleventyConfig.addFilter("photoHash", async (src) => {
    const cached = loadCached();
    if (!(src in cached)) {
      cached[src] = await getPixelHash('src/' + src);
    }
    const hash = cached[src];
    const truncated = `${hash}`;
    return truncated.slice(0, 16);
  });
  
  eleventyConfig.on('eleventy.after', () => {
    saveHashes();
  });
  
  async function exif(src) {
    return await exifr.parse("src/" + src);
  }

  eleventyConfig.addFilter("exif", exif);

  eleventyConfig.addFilter("camera", exif => {
    const make = exif.Make;
    const model = exif.Model;

    if (!model && !make) {
      return null;
    }

    if (make && !model) {
      return make;
    }
    
    if (model && !make) {
      return model;
    }

    return model.startsWith(make) ? model : `${make} ${model}`;    
  });

  eleventyConfig.addFilter("fnum", exif => {
    if (exif.FNumber) {
      return `f/${exif.FNumber}`;
    }
    return null;
  });

  eleventyConfig.addFilter("shutter", exif => {
    if (isNaN(exif.ExposureTime)) {
      return null;
    }
    const t = 1 / exif.ExposureTime;
    return `1/${t.toFixed(2)}`;
  });

  eleventyConfig.addFilter("iso", exif => {
    if (isNaN(exif.ISO)) {
      return null;
    }
    return `ISO ${exif.ISO}`;
  });
  
  return {
    dir: {
      input: 'src'
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
