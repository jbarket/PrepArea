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
                templateUrl: "views/tabs.html"
            })
            .state('tabs.sets', {
                url: '/sets',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/sets.html',
                        controller: 'SetsCtrl as setsCtrl'
                    }
                }
            })
            .state('tabs.characters', {
                url: '/characters/:setName',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/characters.html',
                        controller: 'CharactersCtrl as charactersCtrl'
                    }
                }
            })
            .state('tabs.basic', {
                url: '/basics/:setName',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/basic.html',
                        controller: 'BasicCtrl as basicCtrl'
                    }
                }
            })
            .state('tabs.details', {
                url: '/characters/:setName/details/:characterName',
                views: {
                    'collection-tab': {
                        templateUrl: 'views/sets/details.html',
                        controller: 'DetailsCtrl as detailsCtrl'
                    }
                }
            })
            .state('tabs.teams', {
                url: '/teams',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/teams.html',
                        controller: 'TeamsCtrl as teamsCtrl'
                    }
                }

            })
            .state('tabs.show', {
                url: '/teams/show/:uuid',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/show.html',
                        controller: 'ShowCtrl as showCtrl'
                    }
                }
            })
            .state('tabs.edit', {
                url: '/teams/edit/:uuid',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/edit.html',
                        controller: 'EditCtrl as editCtrl'
                    }
                }
            })
            .state('tabs.cards', {
                url: '/teams/cards/:uuid',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/cards.html',
                        controller: 'CardsCtrl as cardsCtrl'
                    }
                }
            })
            .state('tabs.dice', {
                url: '/teams/dice/:uuid',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/dice.html',
                        controller: 'DiceCtrl as diceCtrl'
                    }
                }
            });
    })
    .controller('MainCtrl', ['$scope', '$rootScope', '$localForage', 'Sets',
        function ($scope, $rootScope, $localForage, Sets) {

            $localForage.get('owned').then(function(data) {
                if (data) {
                    $rootScope.owned = data;
                    angular.forEach(Sets.all, function(set) {
                        angular.forEach(set.characters, function (character) {
                            if (!$scope.owned && $scope.owned[set.name + '-dice' + charcter.name]) {
                                $scope.owned[set.name + '-dice' + charcter.name] = 0;
                            }
                        });
                    });
                }
                else {
                    $rootScope.owned = {};
                    angular.forEach(Sets.all, function(set) {
                        angular.forEach(set.characters, function (character) {
                            if (!$scope.owned && $scope.owned[set.name + '-dice' + charcter.name]) {
                                $scope.owned[set.name + '-dice' + charcter.name] = 0;
                            }
                        });
                    });
                }
            });


            $localForage.get('teams').then(function(data) {
                if (data) {
                    console.log("[LF] Found existing Team data.");
                    $rootScope.teams = data;
                    console.log($rootScope.teams);
                }
                else {
                    console.log("[LF] No Team data found. Initializing.");
                    $rootScope.teams = [];
                }

            });

            $rootScope.$watch('owned', function() {
                if ($rootScope.owned !== undefined) {
                    $localForage.setItem('owned', $rootScope.owned);
                }
            }, true);

            $rootScope.$watch('teams', function() {
                if ($rootScope.teams !== undefined) {
                    console.log("[LF] Team change detected. Persisting.");
                    $localForage.setItem('teams', $rootScope.teams);
                }
            }, true);

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


        }
    ]);


