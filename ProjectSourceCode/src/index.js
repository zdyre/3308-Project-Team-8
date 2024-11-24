// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); // changge it from bcryptjs to bcrypt
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.


app.use(express.static(__dirname + '/'));

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'dpg-csvplfhu0jms738b8sbg-a', // the database server toggle between 'db' and 'dpg-csvplfhu0jms738b8sbg-a' for local or cloud hosting
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());  // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));

const Handlebars = require('handlebars');
const { profile } = require('console');

// Register a custom helper to serialize data to JSON
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});


// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here

// Default
app.get('/', (req, res) => {
  res.redirect('/home');
});

// Home  get route
app.get('/home', async (req, res) => {
  const user = req.session.user;
  var username = "Guest";
  if (user) {username = user.username;}

  
  // Call API to populate books display upon loading /home
  axios({
    url: `https://www.googleapis.com/books/v1/volumes`,
    method: 'GET',
    dataType: 'json',
    headers: {
      'Accept-Encoding': 'application/json',
    },
    params: {
      key: process.env.API_KEY,
      q: 'e',
      maxResults: 40 // cannot exceed 40, limitation set by google
    },
  })
    .then(results => { // process data from API
      
      const google_books = results.data.items;
      var featuredBooks;
      if (user) {
        // temporary || make based off friends and preferencecs if user logged in
      } else {
        featuredBooks = google_books.slice(1,7); // this determines what books are displayed
      }
      const trendingBooks = google_books.slice(7,13);
      
      // render home page
      res.render('pages/home',{ // render home page while passing data
          user: user,
          username: username,
          books: google_books,
          featuredBooks: featuredBooks,
          trendingBooks: trendingBooks,
      });
    })
    .catch(error => {
      console.log(error);
      res.status(404);
      // Handle errors
    });
});

// Discover route
app.get('/discover', async (req, res) => {
  const user = req.session.user;
  const username = user ? user.username : 'Guest';// we dont have guest, right ?   
  if (user) {
    try {
      // Query for the most recent books, ordered by publish_date
      const newReleases = await db.any(
        'SELECT id, book_title, author, thumbnail_link, publish_date, google_volume FROM books ORDER BY publish_date DESC LIMIT 6;'
      );
  
      res.render('pages/discover', {
        user: user,
        username: username,
        newReleases: newReleases, 
      });
    } catch (error) {
      // Handle errors during the database query
      console.log(error);
      res.status(500).send('Error fetching new releases');
    }
  } else {
    res.status(302);
    res.redirect('/login');
  }  

});


// Profile route (w/ determine user page)
let USER_PROFILE = null;
app.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');  // Redirect to login if the user is not authenticated

  const logged_in_user = req.session.user;  // differentiate between logged in user and profile user (in case of viewing other profile)
  let profile;
  if (USER_PROFILE) { // this constant variable sets user to someone else if calling their profile page
    profile = USER_PROFILE;
  } else {
    profile = await db.one('SELECT * FROM profiles WHERE username = $1;',[logged_in_user.username]);
  }
  // generate data to pass to render 
  const username = profile.username;
  var description = profile.description;
  const profile_id = profile.id;
  const user_id = logged_in_user.id;
  const reviews = await db.any('SELECT * FROM reviews INNER JOIN reviews_to_books ON reviews.id = review_id INNER JOIN books ON reviews_to_books.book_id = books.id WHERE username = $1 GROUP BY reviews.id, reviews_to_books.review_id, reviews_to_books.book_id, books.id ORDER BY rating DESC LIMIT 15;', [username]);
  const friends = await db.any('SELECT * FROM friends INNER JOIN profiles ON profiles.id = friends.friend_id WHERE friends.user_id = $1 GROUP BY profiles.username, profiles.id, friends.user_id, friends.friend_id LIMIT 10;',[profile.id]);
  const liked_books = await db.any('SELECT * FROM books INNER JOIN reviews_to_books ON books.id = book_id INNER JOIN reviews ON reviews_to_books.review_id = reviews.id WHERE reviews.username = $1 AND books.avg_rating > 3.0 LIMIT 4;', [username]);
  const recently_read = await db.any('SELECT * FROM books INNER JOIN reviews_to_books ON books.id = book_id INNER JOIN reviews ON reviews_to_books.review_id = reviews.id WHERE reviews.username = $1 GROUP BY reviews.id, reviews_to_books.review_id, reviews_to_books.book_id, books.id ORDER BY reviews.id DESC LIMIT 4;', [username])
  const is_my_profile = (username == logged_in_user.username);
  var is_friend = false;
  friends.forEach(friend => { // determines is the logged in user is on the profile's friend list
    if (friend.username == logged_in_user.username) {is_friend = true;} else {is_friend = is_my_profile;}
  });


  //console.log({username, description, reviews, friends, liked_books});
  
  USER_PROFILE = null;
  // Modified profile data for testing
  res.render('pages/profile', {
    profile_id,
    user_id,
    username,
    logged_in_username: logged_in_user.username,
    description,
    liked_books,
    recently_read,
    reviews,
    friends,
    is_my_profile,
    is_friend
  });
});

//profile route (otheruser)
app.get('/profile/:username', async (req, res) => {
  const logged_in_user = req.session.user;
  const username = req.params.username;
  const profile = await db.one('SELECT * FROM profiles WHERE username = $1', [username]); // retrieve relant profile info from database
  // update default description if viewing a different user's profile
  if (profile.description == 'Add a Description of Yourself!' && username != logged_in_user.username) {profile.description = 'This user is too reclusive to add a description!'}
  USER_PROFILE = profile;
  res.redirect('/profile'); // call regular profile path with updated info
});

// edit profile description
app.put('/editDesc', async (req, res) => { // when a user edits their profile description, update database
  const description = req.body.description;
  const user = req.session.user;
  await db.none('UPDATE profiles SET description = $1 WHERE profiles.username = $2', [description, user.username]);
  res.redirect(303, '/profile'); // 303 here allows a redirect from PUT to GET
});

// add friend route
app.post('/addFriend', async (req, res) => { // add friend to database
  const user_id = req.body.user_id;
  const friend_id = req.body.profile_id;
  await db.none('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2),($2, $1);',[user_id, friend_id]);
  res.status(200);
});

// remove friend route
app.post('/removeFriend', async (req, res) => { // remove friend from database
  const user_id = req.body.user_id;
  const friend_id = req.body.profile_id;
  const query = 'DELETE FROM friends WHERE user_id = $1 AND friend_id = $2;';
  await db.none(query,[user_id, friend_id]);
  await db.none(query,[friend_id, user_id]); // deletes both instances from the friends table
  res.status(200);
});

// Login route
//Used bcrypt instead of bcryptjs
// it works by hashing the password and comparing it to the hashed password in the database
app.get('/login', (req, res) => {
  if (req.session.user) {res.redirect('/');} // check if user is already logged in
  res.render('pages/login');
});

// login submission route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]); // fetch user details from database
    if (user && bcrypt.compareSync(password, user.password)) { //`bcrypt.compareSync` compares the password entered by the user with the hashed password in the database
      req.session.user = user;
      req.session.save();

      let is_populated = false; // is books database already populated
      const is_populated_query = `SELECT google_volume FROM books WHERE id = 1;`;
      await db.oneOrNone(is_populated_query)
            .then(results => {
              if(results) {is_populated = true;}
            });

      if (!is_populated) { // if the database isn't already populated, populate it
        const param_q = ['e','a','t','s'];
        const param_maxResults = 40; // cannot exceed 40, limitation set by google
        
        for(var j = 0; j < 4; j++) { // loop 4 different api calls with different search queries (this upgrades imported books from 40 to 160)
          var loop_q = param_q[j];
          // Call API to populate book database tables upon loading /home
          await axios({
            url: `https://www.googleapis.com/books/v1/volumes`,
            method: 'GET',
            dataType: 'json',
            headers: {
              'Accept-Encoding': 'application/json',
            },
            params: {
              key: process.env.API_KEY,
              q: loop_q,
              maxResults: param_maxResults // cannot exceed 40, limitation set by google
            },
          })
          .then(results => { // save results as variables for clarity
            const books = results.data.items;
            for (let i = 0; i < param_maxResults; i++) {
              var title = books[i].volumeInfo.title;
              if (books[i].volumeInfo.authors) {var author = books[i].volumeInfo.authors[0];}
              if(books[i].volumeInfo.imageLinks) {var thumbnail = books[i].volumeInfo.imageLinks.thumbnail;}
              var desc = books[i].volumeInfo.description;
              var sample = books[i].volumeInfo.previewLink;
              var purchase = books[i].saleInfo.buyLink;
              var google_vol = books[i].id;
              var publish_date = books[i].volumeInfo.publishedDate;


              //console.log(google_vol);

              // NO AVG RATING INSERTION (intentional)
              var query = `INSERT INTO books (book_title, author, thumbnail_link, description, sample, purchase_link, google_volume, publish_date) VALUES ($1, $2, $3, $4, $5, $6, $7, convert_partial_date($8)) RETURNING *;`;
              db.any(query, [
                title,
                author,
                thumbnail,
                desc,
                sample,
                purchase,
                google_vol,
                publish_date
              ])
              /*.then(results => {
                console.log(results);
              })*/
              .catch(error => {
                console.log(error);
              });
            }
          })
          .catch(err => {
            res.status(500).send('Database failed to populate');
          });
        }
      }

      res.status(302).redirect('/home'); // redirecet to home after populating database
    } else {
      res.status(401).send('Invalid username or password');
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal server error');
  }
});



// Register route
app.get('/register', (req, res) => {
  if (req.session.user) {res.redirect('/');} // check if user is already logged in
  res.render('pages/register');
});

// register submission route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10); //`bcrypt.hashSync` hashes the password entered by the user
  try {
    // insert new user into database
    var user_id = await db.one('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id;', [username, hashedPassword]);
    // create a profile entry for user
    const profile_query = `INSERT INTO profiles (username, description) VALUES ($1, $2) RETURNING id;`;
    var profile_id = await db.one(profile_query, [username, "Add a Description of Yourself!"]);
    // link user table to profile table
    await db.none('INSERT INTO users_to_profiles (user_id, profile_id) VALUES ($1, $2);', [user_id.id, profile_id.id]);

    res.status(200).redirect('/login');
  } catch (error) {
    res.status(400).send('Invalid input');
  }
});

// Authentication Middleware
const auth = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

app.use(auth);

// Book route
app.get('/book', (req, res) => {
  if (book && reviews && username) {
    res.render('pages/book', { book, reviews, username}); 
  } else {
    res.redirect('pages/home'); // redirects invalid path to home
  }
});

// fetch book details route
app.get('/book/:id', async (req, res) => {
  console.log(req.params);
  const book_google_vol = `${req.params.id}`;
  const username = req.session.user.username;
  try {
    const book = await db.oneOrNone('SELECT * FROM books WHERE google_volume = $1;', [book_google_vol]);
    var reviews = await db.any('SELECT * FROM reviews INNER JOIN reviews_to_books ON reviews.id = reviews_to_books.review_id WHERE book_id = $1;', [book.id]);
   
    res.render('pages/book', {book, reviews, username}); // render page with books details and reviews
  } catch (error) {
    console.log(error);
    res.status(500).send('Error fetching book details');
  }
});


// new review submission path
app.post('/addReview', async (req, res) => {
  const {title, description, rating, visibility, google_volume} = req.body;
  const user = req.session.user;
  if (!user) {
    res.status(401).send('Please log in to submit a review'); // user auth
    return;
  }

  try {
    // populate review data and fetch review and book id
    var review_id = await db.one('INSERT INTO reviews (username, google_volume, rev_title, rev_description, rating, visibility) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;', [user.username, google_volume, title, description, rating, visibility]);
    var book_id = await db.one('SELECT id FROM books WHERE google_volume = $1;',[google_volume]);
    
    // link review, book, and profile in respective tables
    await db.none('INSERT INTO reviews_to_books (review_id, book_id) VALUES ($1, $2);', [review_id.id, book_id.id]);
    await db.none('INSERT INTO reviews_to_profiles (review_id, profile_id) VALUES ($1, $2);',[review_id.id, user.id]);
    await db.none('UPDATE books SET avg_rating = (SELECT AVG(rating) FROM reviews WHERE google_volume = $2) WHERE id = $1;', [book_id.id, google_volume])
    res.status(200);
    
  } catch (error) {
    res.status(500).send('Error submitting review');
  }
});

// view all reviews for one book route
app.get('/reviews/:id', async (req, res) => {
  const book_google_vol = `${req.params.id}`;
  const user = req.session.user;

  if (!user) {
    res.status(401).send('Please log in to view all reviews'); // user auth
    return;
  }

  var reviews = await db.any('SELECT * FROM reviews WHERE google_volume = $1', [book_google_vol]);

  res.render('pages/reviews', {user, reviews}); 
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
module.exports = app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // Assumes you use session for authentication
  next();
});