angular.module('app', ['teams', 'collection', 'ionic', 'ui.router', 'LocalForageModule',
    'providers', 'formatters'])
    .run(['$ionicPlatform',
        function($ionicPlatform) {
            $ionicPlatform.ready(function() {
                analytics.startTrackerWithId('UA-51386708-1');
            });
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
                url: '/teams/show/:teamIndex?isNew',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/show.html',
                        controller: 'ShowCtrl as showCtrl'
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
                    $rootScope.teams = data;
                }
                else {
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


