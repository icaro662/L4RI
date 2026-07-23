/*
Universal commands handler for the bot. 
This file is responsible for routing commands to their respective handlers based on the message content.
*/

import { urlParser } from "./urlParser.js";
import { handleGrok } from "../commands/grok.js";
import { handleGrokAnalyze } from "../commands/grok.js";
import { handleSearch } from "../commands/search.js";
import { handleImgSearch } from "../commands/imgSearch.js";
import { handleFreeCheck } from "../commands/freeGames.js";
import { handleYoutube } from "../commands/youtube.js";
import { handleCopyPastaBR } from "../commands/fun.js";
import { handleAvatar } from "../commands/avatar.js";
import { handleCanvas } from "../commands/canvas.js";
import { handleImageGen } from "../commands/imgGen.js";
import { handleWikiRandom } from "../commands/wiki.js";
import { handleWikiSearch } from "../commands/wiki.js";

const uniHandler = {
  handleGrok,
  handleGrokAnalyze,
  handleSearch,
  handleImgSearch,
  handleFreeCheck,
  handleYoutube,
  handleCopyPastaBR,
  handleAvatar,
  handleCanvas,
  handleImageGen,
  handleWikiRandom,
  handleWikiSearch,
};

export default uniHandler;