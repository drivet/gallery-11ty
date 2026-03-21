import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import { inspect } from "util";
import _ from 'lodash';

export default async function(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  eleventyConfig.addCollection("albumsAndImages", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md")
  );

  eleventyConfig.addCollection("rootAlbums", (collection) =>
    collection.getFilteredByGlob("src/albums/**/*.md").filter(p => !p.data.parent)
  );
  
  eleventyConfig.addCollection('albumByKey', (collection) =>
    _.keyBy(collection.getFilteredByGlob("src/albums/**/*.md"), p => p.data.key)
  );

  eleventyConfig.addFilter('navToPage', (navNodes, albumByKey) => {
    navNodes.forEach(n => {
      if (!n.key) {
        return;
      }
      
      const r = albumByKey[n.key];
      if (!r || !r.data) {
        return;
      }

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
    return `${parentNode.data.title} - ${photoIdx} / ${albumNodes.length}`;
  });

  eleventyConfig.addFilter("cdump", o => inspect(o));
  
  eleventyConfig.addPassthroughCopy({"static": "."});

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    transformOnRequest: false,
    
	// output image formats
	formats: ["jpeg"],

	// output image widths
	widths: [480, 800, 1200],

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
