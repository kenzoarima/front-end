const newrelic = require('newrelic');

(function (){
  'use strict';

  var async     = require("async")
    , express   = require("express")
    , request   = require("request")
    , helpers   = require("../../helpers")
    , endpoints = require("../endpoints")
    , app       = express()

  // List items in cart for current logged in user.
  app.get("/cart", function (req, res, next) {
    console.log("Request received: " + req.url + ", " + req.query.custId);
    var custId = helpers.getCustomerId(req, app.get("env"));
    console.log("Customer ID: " + custId);
    request(endpoints.cartsUrl + "/" + custId + "/items", function (error, response, body) {
      if (error) {
        return next(error);
      }
      helpers.respondStatusBody(res, response.statusCode, body)
    });
  });

  // Delete cart
  app.delete("/cart", function (req, res, next) {
    var custId = helpers.getCustomerId(req, app.get("env"));
    console.log('Attempting to delete cart for user: ' + custId);
    var options = {
      uri: endpoints.cartsUrl + "/" + custId,
      method: 'DELETE'
    };
    request(options, function (error, response, body) {
      if (error) {
        return next(error);
      }
      console.log('User cart deleted with status: ' + response.statusCode);
      helpers.respondStatus(res, response.statusCode);
    });
  });

  // Delete item from cart
  app.delete("/cart/:id", function (req, res, next) {
    if (req.params.id == null) {
      return next(new Error("Must pass id of item to delete"), 400);
    }

    console.log("Delete item from cart: " + req.url);

    console.log("req.session cart");
    console.log(req.session);
    var custIdKen = (req.session.customerId ? req.session.customerId : "100");

    newrelic.addCustomAttributes({
      "customerId": custIdKen,
      "action": "cart_delete",
      "item_id": req.params.id
    });

    var custId = helpers.getCustomerId(req, app.get("env"));

    var options = {
      uri: endpoints.cartsUrl + "/" + custId + "/items/" + req.params.id.toString(),
      method: 'DELETE'
    };
    request(options, function (error, response, body) {
      if (error) {
        return next(error);
      }
      console.log('Item deleted with status: ' + response.statusCode);
      helpers.respondStatus(res, response.statusCode);
    });
  });

  // Add new item to cart
  app.post("/cart", function (req, res, next) {
    console.log("Attempting to add to cart: " + JSON.stringify(req.body));

    if (req.body.id == null) {
      next(new Error("Must pass id of item to add"), 400);
      return;
    }

    console.log("req.session cart");
    console.log(req.session);
    var custIdKen = (req.session.customerId ? req.session.customerId : "100");

    newrelic.addCustomAttributes({
      "customerId": custIdKen,
      "action": "cart_add",
      "item_id": req.body.id,
      "item_quantity": 1
    });

    var custId = helpers.getCustomerId(req, app.get("env"));

    async.waterfall([
        function (callback) {
          request(endpoints.catalogueUrl + "/catalogue/" + req.body.id.toString(), function (error, response, body) {
            console.log(body);
            callback(error, JSON.parse(body));
          });
        },
        function (item, callback) {
          var options = {
            uri: endpoints.cartsUrl + "/" + custId + "/items",
            method: 'POST',
            json: true,
            body: {itemId: item.id, unitPrice: item.price}
          };
          console.log("POST to carts: " + options.uri + " body: " + JSON.stringify(options.body));
          request(options, function (error, response, body) {
            if (error) {
              callback(error)
                return;
            }
            callback(null, response.statusCode);
          });
        }
    ], function (err, statusCode) {
      if (err) {
        return next(err);
      }
      if (statusCode != 201) {
        return next(new Error("Unable to add to cart. Status code: " + statusCode))
      }
      helpers.respondStatus(res, statusCode);
    });
  });

// Update cart item
  app.post("/cart/update", function (req, res, next) {
    console.log("Attempting to update cart item: " + JSON.stringify(req.body));

    newrelic.addCustomAttributes({
      "customerId": custIdKen,
      "action": "cart_update",
      "item_id": req.body.id,
      "item_quantity": req.body.quantity
    });

    if (req.body.id == null) {
      next(new Error("Must pass id of item to update"), 400);
      return;
    }

    if (req.body.quantity == null) {
      next(new Error("Must pass quantity to update"), 400);
      return;
    }

    // throw an error when quantity is greater than 10
    if (parseInt(req.body.quantity) > 10) {
      console.log("Quantity limit per customer reached", req.body.quantity);
      throw new Error("Quantity limit per customer reached");
    }

    console.log("req.session cart");
    console.log(req.session);
    var custIdKen = (req.session.customerId ? req.session.customerId : "100");

    var custId = helpers.getCustomerId(req, app.get("env"));

    async.waterfall([
        function (callback) {
          request(endpoints.catalogueUrl + "/catalogue/" + req.body.id.toString(), function (error, response, body) {
            console.log(body);
            callback(error, JSON.parse(body));
          });
        },
        function (item, callback) {
          var options = {
            uri: endpoints.cartsUrl + "/" + custId + "/items",
            method: 'PATCH',
            json: true,
            body: {itemId: item.id, quantity: parseInt(req.body.quantity), unitPrice: item.price}
          };
          console.log("PATCH to carts: " + options.uri + " body: " + JSON.stringify(options.body));
          request(options, function (error, response, body) {
            if (error) {
              callback(error)
                return;
            }
            callback(null, response.statusCode);
          });
        }
    ], function (err, statusCode) {
      if (err) {
        return next(err);
      }
      if (statusCode != 202) {
        return next(new Error("Unable to add to cart. Status code: " + statusCode))
      }
      helpers.respondStatus(res, statusCode);
    });
  });
  
  module.exports = app;
}());
