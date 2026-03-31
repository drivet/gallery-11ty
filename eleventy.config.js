import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { inspect } from "util";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import _ from 'lodash';

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
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.parent)
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

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    transformOnRequest: false,
    
	// output image formats
	formats: ["jpeg"],

	// output image widths
	widths: [480, 800, 1200],

    fixOrientation: true,
    
	// optional, attributes assigned on <img> nodes override these values
	htmlOptions: {
	  imgAttributes: {
		loading: "lazy",
		decoding: "async",
        sizes: "(width < 600px) 480px, 800px"
	  }
	}
  });
  
  return {
    dir: {
      input: 'src'
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
