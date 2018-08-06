/*jshint esversion: 6 */

const functions = require('firebase-functions');
const http = require('http');
const url = require('url');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest((req, res) => {
    // Grab the text parameter.
    const original = req.query.text;
    // Push the new message into the Realtime Database using the Firebase Admin SDK.
    return admin.database().ref('/messages').push({
        original: original
    }).then((snapshot) => {
        return res.redirect(303, snapshot.ref.toString());
    });
})

// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
    .onCreate((snapshot, context) => {
        // Grab the current value of what was written to the Realtime Database.
        const original = snapshot.val();
        console.log('Uppercasing', context.params.pushId, original);
        const uppercase = original.toUpperCase();
        // You must return a Promise when performing asynchronous tasks inside a Functions such as
        // writing to the Firebase Realtime Database.
        // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
        return snapshot.ref.parent.child('uppercase').set(uppercase);
    });

exports.onUserCreate = functions.auth.user().onCreate((user) => {
    return admin.database().ref('/tmdb-user/' + user.uid).set({
        username: user.displayName,
        email: user.email
    });
});

exports.onUserDelete = functions.auth.user().onDelete((user) => {
    return admin.database().ref('/tmdb-user/' + user.uid).remove();
});

exports.getRatedMovie = functions.https.onRequest((req, res) => {
    var ref = admin.database().ref('/tmdb-user/m1AMwKklL6XILvnmAl0JEvJxgcX2').child("rated-movie");
    ref.once("value", (snapshot) => {
        var object = {};
        object["rated-movie"] = snapshot.val();
        res.contentType('application/json');
        res.send(JSON.stringify(object));
    });
});

app.put('/favorite-movie', (req, res) => {
    var uid;
    uid = req.header('uid');
    if (uid === undefined) {
        res.status(401).end('Error: Unauthorized');
    } else {
        var json = req.body;
        var movieId = json.id;
        var movieTitle = json.title;
        var db = admin.database().ref('/tmdb-user/' + uid).child("favorite-movie");
        var isDeleted = false;
        db.once("value", (snapshot) => {
            if (snapshot.numChildren() === 0) {
                db.push({
                    id: movieId,
                    title: movieTitle
                });
            } else {
                snapshot.forEach((data) => {
                    if (data.child("id").val() === movieId) {
                        data.ref.remove();
                        isDeleted = true;
                        // res.status(200).end("Deleted favorite success.");
                        res.status(200).json(setBaseResponse(true, "Deleted favorite success.", json)).end();
                    }
                });
                if (isDeleted === false) {
                    db.push({
                        id: movieId,
                        title: movieTitle
                    });
                    // res.status(200).end("Created favorite success.");
                    res.status(200).json(setBaseResponse(true, "Created favorite success.", json)).end();
                }
            }
        });
    }
});

function setBaseResponse(isSuccessful, msg, json) {
    var baseJson = {
        "success": isSuccessful,
        "message": msg,
        "data": json
    };
    return baseJson;
}

exports.api = functions.https.onRequest(app);