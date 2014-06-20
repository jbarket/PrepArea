angular.module('collection', ['ionic', 'ui.router', 'providers', 'formatters'])
    .config(function($stateProvider) {

        $stateProvider
            .state('tabs.sets', {
                url: '/sets',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/sets.html',
                        controller: 'SetsCtrl as setsCtrl'
                    }
                }
            })
            .state('tabs.card_list', {
                url: '/sets/:id/cards',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/cards.html',
                        controller: 'CardListCtrl as cardListCtrl'
                    }
                }
            })
            .state('tabs.card_art', {
                url: '/cards/:id/art',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/art.html',
                        controller: 'CardArtCtrl as cardArtCtrl'
                    }
                }
            })


            .state('tabs.characters', {
                url: '/characters/:id',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/characters.html',
                        controller: 'CharactersCtrl as charactersCtrl'
                    }
                }
            })
            .state('tabs.basic', {
                url: '/basics/:id',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/basic.html',
                        controller: 'BasicCtrl as basicCtrl'
                    }
                }
            })
            .state('tabs.card_show', {
                url: '/sets/:setId/characters/show/:id',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/details.html',
                        controller: 'CardShowCtrl as showCtrl'
                    }
                }
            });
    })
    .controller('SetsCtrl', ['$scope', 'Sets', 'LoaderService',
        function($scope, Sets, LoaderService) {
            var self = this;
            self.sets = $scope.sets;

        }
    ])
    .controller('CardListCtrl', ['$scope', '$stateParams', '$state', 'Sets', 'Owned', 'LoaderService',
        function($scope, $stateParams, $state, Sets, Owned, LoaderService) {
            var self = this;

            Sets.find($stateParams.id).then(function (set) {
                self.set = set.doc;
            });

            Sets.cardsByCharacterForSet($stateParams.id).then(function (data) {
                self.card_groups = Sets.parseForRepeat(data);
            });

            $scope.getCardHeight = function (card) {
                if (card.doc) {
                    return 37;
                }
                else if (card.type === 'basic') {
                    return 50;
                }
                else if (card.type === 'card') {
                    return 70;
                }
            };

        }
    ])

    .controller('CardArtCtrl', ['$scope', '$stateParams', '$state', 'Sets', 'LoaderService',
        function($scope, $stateParams, $state, Sets, LoaderService) {
            var self = this;

            Sets.findCard($stateParams.id).then(function (data) {
                self.card = data;
            });

        }
    ]);


