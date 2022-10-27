(function (){
  'use strict';

  var express   = require("express")
    , request   = require("request")
    , endpoints = require("../endpoints")
    , helpers   = require("../../helpers")
    , app       = express()

  app.get("/catalogue/images*", function (req, res, next) {
    var url = endpoints.catalogueUrl + req.url.toString();
    request.get(url)
        .on('error', function(e) { next(e); })
        .pipe(res);
  });

  app.get("/catalogue*", function (req, res, next) {

    newrelic.addCustomAttributes({
      "action": "view_catalogue",
      "catalogue": req.url.toString()
    });

    helpers.simpleHttpRequest(endpoints.catalogueUrl + req.url.toString(), res, next);
  });

  app.get("/tags", function(req, res, next) {

    console.log("view_catalogue_tags ");
    console.log(req);

    newrelic.addCustomAttributes({
      "action": "view_catalogue_tags",
      "catalogue": req.url.toString()
    });

    helpers.simpleHttpRequest(endpoints.tagsUrl, res, next);
  });

  module.exports = app;
}());
