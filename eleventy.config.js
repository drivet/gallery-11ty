import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { inspect } from "util";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import _ from 'lodash';
import Image from "@11ty/eleventy-img";

dayjs.extend(utc);
dayjs.extend(timezone);

export default async function(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  eleventyConfig.addCollection("albumsAndImages", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md")
  );

  eleventyConfig.addCollection("albums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.image)
  );
  
  eleventyConfig.addCollection("rootAlbums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.parent && !p.data.image)
  );
  
  eleventyConfig.addCollection('albumByKey', (collection) =>
    _.keyBy(collection.getFilteredByGlob("src/albums/**/*.md"), p => p.data.key)
  );

  eleventyConfig.addFilter("date", d =>
    dayjs(d).tz('America/Montreal').format('MMM D, YYYY, h:mm A Z'));
 
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

  eleventyConfig.addFilter('defaultPhotoTitle', (albumNodes, albumByKey, photoKey, parentKey) => {
    const photoIdx = albumNodes.findIndex(e => e.key === photoKey ) + 1;
    const parentNode = albumByKey[parentKey];
    return `${parentNode.data.title} / ${photoIdx} of ${albumNodes.length}`;
  });

  eleventyConfig.addFilter("cdump", o => inspect(o));
  
  eleventyConfig.addPassthroughCopy({"static": "."});

  async function makeImage(src, width) {
    // the src parameter begins with /photo/* which worked when the HTML
    // transform plugin was used, but which doesn't work in this context.
    // We can compensate by tacking on a src/
    return await Image("src/"+src, {
      widths: [width],
      formats: ["jpeg"],
    }); 
  }
  
  async function imgShortcode(src, alt, cls, width) {
    const data = await makeImage(src, width);
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
    return await imgShortcode(src, alt, cls, 1200);
  }

  async function mediumImage(src, alt, cls) {
    return await imgShortcode(src, alt, cls, 800);
  }
  
  async function smallImage(src, alt, cls) {
    return await imgShortcode(src, alt, cls, 480);
  }
  
  eleventyConfig.addNunjucksAsyncShortcode("smallImage", smallImage);
  eleventyConfig.addNunjucksAsyncShortcode("mediumImage", mediumImage);
  eleventyConfig.addNunjucksAsyncShortcode("largeImage", largeImage);
  
  return {
    dir: {
      input: 'src'
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
