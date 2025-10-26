import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

// Add links you want the AI to learn from
const urls = [
    "https://www.charlesosujifoundation.ca/",
    "https://www.charlesosujifoundation.ca/projects-partnerships/",
    "https://www.charlesosujifoundation.ca/gallery/",
    "https://www.charlesosujifoundation.ca/about-us/",
    "https://www.charlesosujifoundation.ca/recipients/",
    "https://www.charlesosujifoundation.ca/entrepreneurship/",
    "https://www.charlesosujifoundation.ca/advocacy/",
    "https://www.charlesosujifoundation.ca/legal-mentorship/",
    "https://www.charlesosujifoundation.ca/education/",
    "https://www.charlesosujifoundation.ca/programs/",
    "https://www.charlesosujifoundation.ca/about-2-1/",
    "https://www.charlesosujifoundation.ca/contact/"
];

let allText = "";

for (const url of urls) {
  console.log(`Scraping: ${url}`);
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  allText += `\n\n--- PAGE: ${url} ---\n${text}`;
}

fs.writeFileSync("websiteData.txt", allText);
console.log("✅ Website data saved to websiteData.txt");
