const functions = require('firebase-functions');
const http = require('http');
const url = require('url');

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

exports.ratedMovie = functions.https.onRequest((req, res) => {
    if (req.method === "GET") {
        var q = url.parse(req.url, true).query;
        var uid = q.uid;
        var movieId = q.movieId;
        return admin.database().ref('/tmdb-user/' + uid).child("rated-movie").once("value", snapshot => {
            if (snapshot.val() === movieId) {
                snapshot.remove();
            }
            snapshot.push({
                movieId: movieId
            });
        });
    }
});