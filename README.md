# 🌶🍓 Just as Tasty - Petition website

## Live at:

https://justastasty.herokuapp.com/

## Overview

Authentication-based website allowing users to manage their profile, sign an online petition, modify/delete their signature and view signers by city.

The cause: prevent supermarkets from throwing away blemished/imperfect fruit & veggies simply for cosmetic reasons.

🖥 Optimized for full screen desktop.

❓ This application was made as a learning project during the full stack bootcamp at Spiced Academy.

## Features

-   Authentication

    -   registration & login, including hashing of passwords, server-side form validation & data sanitisation

-   Profile editing:

    -   users can update their entire profile information (including password) at any time

-   Signing:

    -   users are able to draw/edit their signature (with immediate render of the updated signature) as well as delete it

-   Viewing signers

    -   once they've signed, users can view a list of other signers (full name, age, city and homepage, if available) and sort it by city

-   Account deletion:

    -   users can delete their accounts including their profile information and signature

## Technology

-   Javascript
-   Handlebars
-   Node.js & Express
-   PostgreSQL
-   Heroku

## Set up this project locally

-   set up a PSQL database as described in the `petition.sql` file in this repo
-   clone the repository
-   install all the dependencies with `npm install`
-   run the project locally with `node server.js` and open it at `localhost:8080/petition`

<!-- ## Previews

### Gallery view + load more on scroll

<img src="public/gallery_pagination_.gif">

<br>

### Uploading an image

<img src="public/image_upload_.gif">

<br>

### Commenting on images

<img src="public/comment_.gif">

<br>

### Single image view + routing

<img src="public/single_view_routing_.gif">

<br>

### New image notification

<img src="public/new_image_notification_.gif">

<br> -->
