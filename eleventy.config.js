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

dayjs.extend(utc);
dayjs.extend(timezone);

export default async function(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(pluginRss);
  
  eleventyConfig.addCollection("albumsAndImages", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md")
  );

  eleventyConfig.addCollection("albums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.image)
  );

  eleventyConfig.addCollection("leafAlbums", (collection) => {
    const allPosts = collection.getFilteredByGlob("src/albums/**/*.md");
    const allLeafKeys = new Map();
    allPosts.forEach(p => {
      if (!p.data.image) {
        return;
      }
      if (allLeafKeys.has(p.data.parent)) {
        allLeafKeys.set(p.data.parent, allLeafKeys.get(p.data.parent) + 1);
      } else {
        allLeafKeys.set(p.data.parent, 1);
      }
    });
    return allPosts.filter(p => allLeafKeys.has(p.data.key)).map(p => {
      p.data.count = allLeafKeys.get(p.data.key);
      return p;
    });
  });
  
  eleventyConfig.addCollection("rootAlbums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.parent && !p.data.image)
  );
  
  eleventyConfig.addCollection('albumByKey', (collection) =>
    _.keyBy(collection.getFilteredByGlob("src/albums/**/*.md"), p => p.data.key)
  );

  eleventyConfig.addFilter("date", d =>
    d ? dayjs(d).tz('America/Montreal').format('MMM D, YYYY, h:mm A Z') : "" );
 
  eleventyConfig.addFilter('navToPage', (navNodes, albumByKey) => {
    navNodes.forEach(n => {
      if (!n.key) {
        return;
      }
      
      const r = albumByKey[n.key];
      if (!r || !r.data) {
        return;
      }

      n.date = r.data.date;
      n.album = r.data.album;
      n.featured = r.data.featured;
      n.image = r.data.image;
      n.content = r.content;
    });
    return navNodes;
  });

  eleventyConfig.addFilter('photoContext', (albumNodes, albumByKey, photoKey, parentKey) => {
    const photoIdx = albumNodes.findIndex(e => e.key === photoKey );

    const parentNode = albumByKey[parentKey];
    const defaultTitle = `${parentNode.data.title} / ${photoIdx + 1} of ${albumNodes.length}`;
    
    let prevUrl;
    if (photoIdx > 0) {
      const prevNavNode = albumNodes[photoIdx-1];
      const prevNode = albumByKey[prevNavNode.key];
      prevUrl = prevNode.url;
    }

    let nextUrl;
    if ((photoIdx + 1) < albumNodes.length) {
      const nextNavNode = albumNodes[photoIdx + 1];
      const nextNode = albumByKey[nextNavNode.key];
      nextUrl = nextNode.url;
    }
    return {defaultTitle, prevUrl, nextUrl};
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
