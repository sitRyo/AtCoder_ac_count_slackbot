import * as botkit from 'botkit';
import axios, { AxiosResponse } from 'axios';
import { SlackBot } from '../botkit/lib/Botkit.js';
import { response } from 'express';
import { resolve } from 'path';
import { reject } from 'async';

interface StoreData {
  ac: number;
  name: string;
}

// token (from .env @see dotenv)
const slackToken: string = require('dotenv').config().parsed.SLACK_TOKEN;
if (!slackToken) {
  console.log('Error: Specify token in environment.');
  process.exit(1);
}

// get user data
const userData: string[] = require('./json/user.json').user;
// store user number of ac
let numofac: StoreData[] = [];
// api
const api: string = 'https://kenkoooo.com/atcoder/atcoder-api/results?user=';

// create empty slackbot instance.
let controller: botkit.SlackController = botkit.slackbot({
  debug: true,
});

controller.spawn({
  token: slackToken,
}).startRTM((err: string, bot: SlackBot, payload: any) => {
  if (err) {
    console.log('Error: Cannot to Slack');
    process.exit(1);
  }
  // console.log(userData);
  for (let i = 0; i < userData.length; i++) {
    console.log(i);
    getUserData(userData[i]);
  }

  console.log(numofac);
});

async function getUserData(name: string) {
  // TODO: 0時に走らせるからその24時間前までの間のACを数える
  const endTime: number = Math.floor(Date.now() / 1000);
  const startTime: number = endTime - 86400;

  let tempData: StoreData = {
    ac: 0,
    name: name,
  };
  let ac: number = 0;
  // console.log(endTime);
  await axios.get(api + name)
  .then((response: AxiosResponse) => {
    for (let i = 0; i < response.data.length; i++) {
      const data = response.data[i];
      console.log(data);
      if (data.epoch_second < endTime && data.epoch_second >= startTime && data.result === 'AC') {
        tempData.ac += 1;
      } else {
        break;
      }
    }
    numofac.push(tempData);
  })
  .catch((err: string) => {
    // 別にprocessを終わらせる必要はない。
    console.log(err);
  })
}
