import * as botkit from 'botkit';
import axios, { AxiosResponse } from 'axios';
import { SlackBot } from '../botkit/lib/Botkit.js';
import { response } from 'express';
import { resolve } from 'path';
import { reject } from 'async';

interface StoreData {
  ac: number;
  pointsum: number;
  name: string;
}

// from .env @see dotenv
const channel_random = require('dotenv').config().parsed.CHANNEL_RANDOM;
const channel_test = require('dotenv').config().parsed.CHANNEL_TEST;
const slackToken: string = require('dotenv').config().parsed.SLACK_TOKEN;
if (!slackToken) {
  console.log('Error: Specify token in environment.');
  process.exit(1);
}

// get user data
// so you need create /json/user.json file and put users ID.
const userData: string[] = require('./json/user.json').user;
// api
const api: string = 'https://kenkoooo.com/atcoder/atcoder-api/results?user=';

// create empty slackbot instance.
let controller: botkit.SlackController = botkit.slackbot({
  debug: true,
});

function spawnSlackBot() {
  controller.spawn({
    token: slackToken,
  }).startRTM((err: string, bot: SlackBot, payload: any) => {
    if (err) {
      console.log('Error: Cannot to Slack');
      process.exit(1);
    }

    Promise.all(userData.map(name => {
      return getUserData(name);
    }))
    .then(results => {
      console.log(results);
      let sendMessage: string = '今日の精進状況\n'
      for (let result of results) {
        sendMessage += result;
      }
      /*
      bot.say({
        text: sendMessage,
        channel: channel_random,
      })*/
      bot.say({
        text: sendMessage,
        channel: channel_test,
      })
    });
  });
}

function getUserData(name: string) {
  return new Promise(resolve => {
    // TODO: 0時に走らせるからその24時間前までの間のACを数える

    // NOTE: js date function returns unixtime stamp in a millisecond of accuracy.
    const endTime: number = Math.floor(Date.now() / 1000);
    const startTime: number = endTime - 86400;
  
    let retData: StoreData = {
      ac: 0,
      pointsum: 0,
      name: name,
    };
  
    axios.get(api + name)
    .then((response: AxiosResponse) => {
      const size = response.data.length;
      for (let i = 0; i < size; i++) {
        const data: any = response.data[i];
        if (data.epoch_second < endTime && data.epoch_second >= startTime && data.result === 'AC') {
          retData.ac += 1;
          retData.pointsum += data.point;
        }
      }

      const message = `${retData.name}: AC ${retData.ac}, point sum ${retData.pointsum}\n`;
      resolve(message);
    })
    .catch((err: string) => {
      // Don't need exit.
      console.log(err);
    })
  })

}

spawnSlackBot();