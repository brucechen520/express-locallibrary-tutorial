const Author = require('../models/author');
const Book = require('../models/book');
const async = require('async');
const mongoose = require('mongoose');
const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all Authors.
exports.author_list = function(req, res) {
    Author.find()
        .sort([['family_name', 'ascending']])
        .exec(function (err, list_authors) {
            if (err) return next(err);
            // Successful, so render
            res.render('author_list', { title: 'Author List', author_list: list_authors });
        })
};

// Display detail page for a specific Author.
exports.author_detail = function(req, res, next) {
    const id = req.params.id;
    async.parallel({
        author: function(callback) {
            Author.findById(id)
                .exec(callback);
        },
        authors_books: function(callback) {
            Book.find({ 'author': id}, 'title summary')
                .exec(callback);
        },
    }, function (err, results) {
        if (err) return next(err);
        if(!results.author) {
            let err = new Error('Author not found!');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books })
    });
};

// Display Author create form on GET.
exports.author_create_get = function(req, res) {
    res.render('author_form', { title: 'Create Author'});
};

// Handle Author create on POST.
exports.author_create_post = [

    // Validate fields.
    body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields.
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('author_form', { title: 'Create Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // Data from form is valid.

            // Create an Author object with escaped and trimmed data.
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                });
            author.save(function (err) {
                if (err) { return next(err); }
                // Successful - redirect to new author record.
                res.redirect(author.url);
            });
        }
    }
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.params.id);
    
    async.parallel({
        author: function(callback) {
            Author.findById(id).exec(callback);
        },
        author_books: function(callback) {
            Book.find({ 'author': id }).exec(callback);
        },
    }, function(err, results) {
        if (err) return next(err);
        if(!results.author) {
            res.redirect('/catalog/authors');
        }
        // Successful, so render.
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.author_books });
    });
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
    const id = mongoose.Types.ObjectId(req.body.authorid);
    async.parallel({
        author: function(callback) {
            Author.findById(id).exec(callback);
        },
        authors_books: function(callback) {
            Book.find({ 'author': id }).exec(callback);
        },
    }, function (err, results) {
        if (err) return next(err);
        // Success
        if (results.authors_books.length > 0) {
            // Author has books. Render in same way as for GET route.
            res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
            return;
        }
        else {
            // Author has no books. Delete object and redirect to the list of authors.
            Author.findByIdAndRemove(id, function deleteAuthor(err) { 
                if (err) return next(err);
                // Success - go to author list
                res.redirect('/catalog/authors');
            })
        }
    })
};

// Display Author update form on GET.
exports.author_update_get = function(req, res) {
    const id = mongoose.Types.ObjectId(req.params.id);

    Author.findById(id, function (err, author) {
        if (err) return next(err);
        if(!author) { 
            let err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Success, so render.
        res.render('author_form', { title: "Update Author", author: author });
    });
};

// Handle Author update on POST.
exports.author_update_post = [
   
    // Validate and santize fields.
    body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    (req, res, next) => {
        const errors = validationResult(req);

        let author = new Author({ 
            first_name: req.body.first_name, 
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id,
        });

        if(!errors.isEmpty()) {
            res.render('author_form', { title: 'Update Author', author: author, errors: errors.array() });
            return;
        }
        else {
            const id = mongoose.Types.ObjectId(req.params.id);
            Author.findByIdAndUpdate(id, author, {}, function (err, theauthor) {
                if (err) return next(err);
                // Successful - redirect to detail page.
                res.redirect(theauthor.url);
            });
        }
    }
];