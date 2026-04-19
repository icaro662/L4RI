function extractUrls(text) {
  return text.match(/https?:\/\/\S+/g) || [];
}

function getEmbedVariants(url) {
  if (url.includes("instagram.com") || url.includes("instagram/reel")) {
    return [
      url.replace("instagram.com", "ddinstagram.com"),
      url.replace("instagram.com", "ssinstagram.com"),
      url,
    ];
  }

  if (url.includes("twitter.com") || url.includes("x.com")) {
    return [
      url.replace(/(twitter|x)\.com/, "fxtwitter.com"),
      url.replace(/(twitter|x)\.com/, "vxtwitter.com"),
      url,
    ];
  }
}

export async function urlParser(content) {
    const urls = extractUrls(content);

    if (urls.length > 0) {
      for (let url of urls) {
        if (
          url.includes("instagram.com") ||
          url.includes("instagram/reel") ||
          url.includes("twitter.com") ||
          url.includes("x.com")
        ) {
          const variants = getEmbedVariants(url);

          await api.channels.deleteMessage(data.channel_id, data.id);

          await api.channels.createMessage(data.channel_id, {
            content:
              variants[0] + "By " + data.author.username,
          });
        }
      }
      return;
    }
  }