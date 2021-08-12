const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
const mongoose = require('mongoose');

// Display list of all Genre.
exports.genre_list = function(req, res) {
    Genre.find()
        .sort([['name', 'ascending']])
        .exec(function (err, list_genres) {
            if (err) return next(err);
            res.render('genre_list', { title: 'Genre List', list_genres: list_genres })
        })
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    async.parallel({
        genre: function(callback) {
            Genre.findById(id)
              .exec(callback);
        },

        genre_books: function(callback) {
          Book.find({ 'genre': id })
            .exec(callback);
        },
    }, function (err, results) {
        if (err) return next(err);
        if ( results.genre == null) {
            let err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books });
    })
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post =  [

    // Validate and santise the name field.
    body('name', 'Genre name must contain at least 3 characters').trim().isLength({ min: 3 }).escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a genre object with escaped and trimmed data.
        var genre = new Genre(
          { name: req.body.name }
        );

        if (!errors.isEmpty()) {
            // There are errors. Render the form again with sanitized values/error messages.
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
            return;
        }
        else {
            // Data from form is valid.
            // Check if Genre with same name already exists.
            Genre.findOne({ 'name': req.body.name })
                .exec( function(err, found_genre) {
                     if (err) { return next(err); }

                     if (found_genre) {
                         // Genre exists, redirect to its detail page.
                         res.redirect(found_genre.url);
                     }
                     else {

                         genre.save(function (err) {
                           if (err) { return next(err); }
                           // Genre saved. Redirect to genre detail page.
                           res.redirect(genre.url);
                         });
                     }
                 });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    
    async.parallel({
        genre: function(callback) {
            Genre.findById(id).exec(callback);
        },
        genre_books: function(callback) {
            Book.find({ 'genre': id }).exec(callback);
        },
    }, function(err, results) {
        if (err) return next(err);
        if(!results.genre) {
            res.redirect('/catalog/genres');
        }
        // Successful, so render.
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.body.id);

    async.parallel({
        genre: function(callback) {
            Genre.findById(id).populate('book').exec(callback);
        },
        genre_books: function(callback) {
            Book.find( { 'genre': id }).exec(callback);
        }
    }, function(err, results) {
        if (err) return next(err);

        if(results.genre_books.length) {
            res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
            return;
        }
        else {
            Genre.findByIdAndRemove(id, function deleteGenre(err) { 
                if (err) return next(err);
                // Success - go to author list
                res.redirect('/catalog/genres');
            })
        }
    });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res) {
    
    const id = mongoose.Types.ObjectId(req.params.id);
    Genre.findById(id, function (err, genre) {
        if (err) return next(err);
        if(!genre) {
            let err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        res.render('genre_form', { title: 'Update Genre', genre: genre });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [

    // Validate and sanitze the name field.
    body('name', 'Genre name must contain at least 3 characters').trim().isLength({ min: 3 }).escape(),
    
    (req, res, next) => {
        const errors = validationResult(req);

        let genre = new Genre({
            name: req.body.name,
            _id: req.params.id
        })

        if( !errors.isEmpty()) {
            res.render('genre_form', { title: 'Update Genre', genre: genre, errors: errors.array() });
            return
        }
        else {
            Genre.findOne({ 'name': req.body.name })
                .exec( function(err, found_genre ) {
                    if(err) return next(err);

                    if(found_genre) { 
                        res.redirect(found_genre.url);
                    }
                    else {
                        const id = mongoose.Types.ObjectId(req.params.id);
                        Genre.findByIdAndUpdate(id, genre, {}, function(err, thegenre) {
                            if (err) return next(err); 
                            // Successful - redirect to genre detail page.
                            res.redirect(thegenre.url);
                        });
                    }
                })
        }
    }
];