import * as botkit from 'botkit';
import axios, { AxiosResponse } from 'axios';
import { SlackBot } from '../botkit/lib/Botkit.js';
import { response } from 'express';
import { resolve } from 'path';
import { reject } from 'async';
import { CronJob } from 'cron';
import { start } from 'repl';

interface StoreData {
  ac: number;
  pointsum: number;
  name: string;
}

// from .env @see dotenv
// dotenv doesn't have ts.d...? 
const channel_random = require('dotenv').config().parsed.CHANNEL_RANDOM;
const channel_test = require('dotenv').config().parsed.CHANNEL_TEST;
const slackToken = require('dotenv').config().parsed.SLACK_TOKEN;

// error handling
try {
  if (channel_random.error !== undefined) {
    throw channel_random.error;
  }
  if (channel_test.error !== undefined) {
    throw channel_test.error;
  }
  if (slackToken.error !== undefined) {
    throw slackToken.error;
  }
} catch (e) {
  console.log(e);
  process.exit(1);
}

// get user data
// so you need create /json/user.json file and put users ID.
let userData: string[] = [];
try {
  userData = require('./json/user.json').user;
} catch (e) {
  // maybe ./json/user.json didn't create.
  console.log(e);
  process.exit(1);
}

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
      console.log('Error: Cannot to connect Slack');
      process.exit(1);
    }
    
    const job: CronJob = new CronJob({
      cronTime: '00 00 00 * * 0-6',

      onTick: () => {
        const endTime: number = Math.floor(Date.now() / 1000);
        const startTime: number = endTime - 86400;
        Promise.all(userData.map(name => {
          return getUserData(name, endTime, startTime);
        }))
        .then(results => {
          console.log(results);
          let sendMessage: string = '今日の精進状況\n'
          for (let result of results) {
            sendMessage += result;
          }
          bot.say({
            text: sendMessage,
            channel: channel_random,
          })
          /*
          bot.say({
            text: sendMessage,
            channel: channel_test,
          })*/
        });
      },

      onComplete: () => {
        console.log('task is over!');
      }, 

      start: false,

      timeZone: 'Asia/Tokyo',
    })

    job.start();
  });
} 

function getUserData(name: string, endTime: number, startTime: number) {
  return new Promise(resolve => {
    // TODO: 0時に走らせるからその24時間前までの間のACを数える
    // NOTE: js date function returns unixtime stamp in a millisecond of accuracy.
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