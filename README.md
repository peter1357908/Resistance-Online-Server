# Online Multiplayer Game API

![Team Photo](https://i.imgur.com/FAXdtY4.jpg)

We will be building an online version of the popular game, Resistance. The game will be free-to-play with no sign-ups required!

Please refer to [our protocol](doc/protocol.md) for communication between front-end and back-end for some extra reading if you would like to!

## Architecture

We plan on organizing our project similarly to how we've implemented the blog project we built in lab 3.

Backend (host on Heroku):
* Socket.io
* Express
* MongoDB

Frontend (host on Surge):
* Webpack (to bundle everything together)
* Socket.io-client
* React
* SCSS

We will also use p5.js and mo.js to support some simple graphics / animations and for UI!

## Setup

We'll use yarn to manage our packages, like we've been doing in the labs. So, install all the dependencies with: `yarn install`

## Deployment

We'll deploy to the front-end surge, as we've been doing for the labs. As mentioned already, the back-end will be hosted on Heroku.

## Authors

* Will Baxley
* Jose Chanchavac
* Sunbir Chawla
* Peter Gao
* Bryan Shin
* Carlos Yepes    
  
## Acknowledgments

SHOUT OUT TO TIM!!!

We'd also like to thank all developers of crappy online Resistance games, who inspired us to make something better.
