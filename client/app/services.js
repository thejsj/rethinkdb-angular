/*global angular:true, moment:true, _:true */
(function () {
  'use strict';

  angular.module('rethinkDBWorkshop.services', [])
    .factory('MessageFactory', MessageFactory);

  MessageFactory.$inject = ['$http',  '$rootScope'];

  function MessageFactory ($http, $rootScope) {

    var socket = io.connect('http://' + window.config.url + ':' + window.config.ports.http);
    var messageCollection = [];

    socket.on('message', function (message) {
      $rootScope.$apply(function () {
        messageCollection.push(message);
      });
    });

    var factory = {
      insertMessage: insertMessage,
      getMessageCollection: getMessageCollection,
    };

    factory.getMessageCollection();

    return factory;

    function getMessageCollection() {
      return $http.get('/message')
        .then(function (res) {
          res.data.forEach(function (row) {
            messageCollection.push(row);
          });
          return messageCollection;
        });
    }

    function insertMessage(text) {
      return $http.post('/message', {
        text: text,
        email: window.config.email
      });
    }

  }

})();
