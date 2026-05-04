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
 
    return [url];
}

export async function urlParser(message) {
  if (!message?.content) return;

  else if (message.author?.bot) return;

  const urls = extractUrls(message.content);

  console.log("Extracted URLs:", urls);

  const supported = urls.filter(
    (url) =>
      url.includes("instagram.com") ||
      url.includes("twitter.com") ||
      url.includes("//x.com")
  );

    console.log("Supported: " + supported)

  if (supported.length === 0) return;

  await message.delete(message.channel_id, message.id);

  for (let url of supported) {
    console.log("Processing URL:", url);
    const variants = getEmbedVariants(url);
    console.log("Embed Variants:", variants);
    await message.reply({
      content: `${variants[0]}` + "\n" + `By ${message.author.username}`,
    });
  }
}
