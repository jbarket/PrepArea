angular.module('app', ['teams', 'collection', 'ionic', 'ui.router', 'LocalForageModule',
    'providers', 'formatters'])
    .run(['$ionicPlatform',
        function($ionicPlatform) {
//            $ionicPlatform.ready(function() {
//                analytics.startTrackerWithId('UA-51386708-1');
//            });
        }
    ])
    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise("/tab/sets");

        $stateProvider
            .state('tabs', {
                url: "/tab",
                abstract: true,
                controller: "MainCtrl",
                templateUrl: "views/tabs.html",
                resolve: {
                    setup: function ($q, $rootScope, Owned, Sets, LoaderService) {

                        var deferred = $q.defer();

                        LoaderService.show();

                        Owned.setup().then(function () {

                            var setPromise = Sets.all().then(function (data) {
                                $rootScope.sets = data.rows;
                            });

                            var ownedPromise = Owned.find().then(function (data) {
                                $rootScope.owned = data;
                            });

                            var cardsPromise = Sets.cardsByCharacter().then(function (data) {
                                $rootScope.card_groups = data.rows;
                            });

                            $q.all([setPromise, ownedPromise, cardsPromise]).then(function () {
                                deferred.resolve();
                                LoaderService.hide();
                            });


                        });

                        return deferred.promise;
                    }

                }
            });
    })
    .controller('MainCtrl', ['$q', '$scope', '$rootScope', 'LoaderService', '$ionicPopup',
        'Sets', 'Owned',
        function ($q, $scope, $rootScope, LoaderService, $ionicPopup, Sets, Owned) {

            $rootScope.raritySort = function(card) {
                switch(card.rarity) {
                    case "Common":
                        return card.number;
                    case "Uncommon":
                        return card.number + 1000;
                    case "Rare":
                        return card.number + 2000;
                    case "Super-Rare":
                        return card.number + 3000;
                }

            };

            $rootScope.openDiceModal = function (set, character) {

                if (character && character.key[2] === 'character') {

                    $rootScope.modalCharacter = character;
                    $rootScope.modalSet = set;

                    var diceModal = $ionicPopup.show({
                        templateUrl: 'views/sets/modal_dice.html',
                        title: $rootScope.modalCharacter.key[1],
                        subTitle: "How many dice do you own?",
                        scope: $rootScope,
                        buttons: [

                            {
                                text: '<b>Save</b>',
                                type: 'button-positive',
                                onTap: function(e) {
                                    Owned.save($rootScope.owned);
                                }
                            }
                        ]
                    });


                }


            };

            $rootScope.openCardModal = function (card) {
                $rootScope.card = card;

                var cardModal = $ionicPopup.show({
                    templateUrl: 'views/sets/modal_card.html',
                    title: $rootScope.card.name,
                    subTitle: "How many cards do you own?",
                    scope: $rootScope,
                    buttons: [

                        {
                            text: '<b>Save</b>',
                            type: 'button-positive',
                            onTap: function(e) {
                                Owned.save($rootScope.owned);
                            }
                        }
                    ]
                });

            };

            $rootScope.addDie = function (set, character) {

                if ($rootScope.owned[set._id + '-dice-' + character.id]) {
                    $rootScope.owned[set._id + '-dice-' + character.id]++;
                }
                else {
                    $rootScope.owned[set._id + '-dice-' + character.id] = 1;
                }

            };

            $rootScope.removeDie = function (set, character) {

                if ($rootScope.owned[set._id + '-dice-' + character.id] && $rootScope.owned[set._id + '-dice-' + character.id] > 0) {
                    $rootScope.owned[set._id + '-dice-' + character.id]--;
                }
                else {
                    $rootScope.owned[set._id + '-dice-' + character.id] = 0;
                }

            };

            $rootScope.addCard = function (card) {

                if ($rootScope.owned['cards-' + card._id]) {
                    $rootScope.owned['cards-' + card._id]++;
                }
                else {
                    $rootScope.owned['cards-' + card._id] = 1;
                }

            };

            $rootScope.removeCard = function (card) {

                if ($rootScope.owned['cards-' + card._id] && $rootScope.owned['cards-' + card._id] > 0) {
                    $rootScope.owned['cards-' + card._id]--;
                }
                else {
                    $rootScope.owned['cards-' + card._id] = 0;
                }

            };


        }
    ])
    .factory('LoaderService', function($rootScope, $ionicLoading) {

        return {
            show : function() {

                $ionicLoading.show({

                    template: '<i class="assertive icon ion-refreshing" style="font-size: 50px;""></i>',
                    animation: 'fade-in',
                    showBackdrop: true,
                    maxWidth: 200
                });
            },
            hide : function(){
                $ionicLoading.hide();
            }
        };
    });


