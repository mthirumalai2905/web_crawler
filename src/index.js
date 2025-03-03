import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { parse as urlParse } from "url";

const seenUrls = new Set();

const getUrl = (link, host, protocol) => {
  if (link.startsWith("http")) {
    return link;
  } else if (link.startsWith("/")) {
    return `${protocol}//${host}${link}`;
  } else {
    return `${protocol}//${host}/${link}`;
  }
};

const sanitizeFilename = (url) => {
  return path.basename(url.split("?")[0]); // Remove query parameters
};

const crawl = async ({ url, ignore }) => {
  if (seenUrls.has(url)) return;
  console.log("Crawling:", url);
  seenUrls.add(url);

  try {
    const { host, protocol } = urlParse(url);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const links = $("a")
      .map((i, link) => link.attribs.href)
      .get();

    const imageUrls = $("img")
      .map((i, link) => link.attribs.src)
      .get();

    if (!fs.existsSync("images")) {
      fs.mkdirSync("images");
    }

    for (const imageUrl of imageUrls) {
      const fullImageUrl = getUrl(imageUrl, host, protocol);
      try {
        const imageResponse = await fetch(fullImageUrl);
        if (!imageResponse.ok) {
          console.error(`Failed to fetch image: ${fullImageUrl}`);
          continue;
        }

        const filename = sanitizeFilename(fullImageUrl);
        const destPath = path.join("images", filename);

        const dest = fs.createWriteStream(destPath);
        imageResponse.body.pipe(dest);
        console.log(`Downloaded image: ${filename}`);
      } catch (error) {
        console.error(`Error downloading image ${fullImageUrl}: ${error.message}`);
      }
    }

    for (const link of links) {
      if (link.includes(host) && !link.includes(ignore)) {
        await crawl({ url: getUrl(link, host, protocol), ignore });
      }
    }
  } catch (error) {
    console.error(`Error crawling ${url}: ${error.message}`);
  }
};

crawl({
  url: "https://x.com/arpit_bhayani",
  ignore: "/search",
});
