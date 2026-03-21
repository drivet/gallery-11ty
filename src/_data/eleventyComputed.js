export default {
  key: (data) => data.key || data.image,
  eleventyNavigation: {
    key: (data) => data.key,
    parent: (data) => data.parent,
    title: (data) => data.title,
  },
};
