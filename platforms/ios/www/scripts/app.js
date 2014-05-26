angular.module('app', ['ionic', 'ui.router', 'LocalForageModule',
    'providers', 'formatters'])

    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise("/");

        $stateProvider
            .state('sets', {
                url: '/',
                templateUrl: 'views/sets/sets.html',
                controller: 'SetsCtrl as setsCtrl'
            })
            .state('characters', {
                url: '/characters/:setName',
                templateUrl: 'views/sets/characters.html',
                controller: 'CharactersCtrl as charactersCtrl'
            })
            .state('details', {
                url: '/characters/:setName/details/:characterName',
                templateUrl: 'views/sets/details.html',
                controller: 'DetailsCtrl as detailsCtrl'
            });
    })
    .controller('MainCtrl', ['$scope', '$rootScope', '$localForage', 'Sets',
        function ($scope, $rootScope, $localForage, Sets) {

            $localForage.get('owned').then(function(data) {
                if (data) {
                    console.log("found existing data");
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
                    console.log("no existing data");
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


            $rootScope.$watch('owned', function() {
                if ($rootScope.owned !== undefined) {
                    $localForage.setItem('owned', $rootScope.owned);
                }
            }, true);



        }
    ])

    .controller('SetsCtrl', ['$scope', 'Sets',
        function($scope, Sets) {

            this.sets = Sets.all;

            $scope.cardCount = function (set) {
                total = 0;
                owned = 0;

                angular.forEach(set.characters, function (character) {
                    angular.forEach(character.cards, function (card) {
                        if ($scope.owned && $scope.owned[set.name + '-cards-' + card.number]) {
                            owned++;
                        }
                        total++;
                    });
                });

                return owned + " / " + total;
            };

        }
    ])

    .controller('CharactersCtrl', ['$scope', '$stateParams', 'Sets',
        function($scope, $stateParams, Sets) {
            this.set_name = $stateParams.setName;
            this.set = Sets.find(this.set_name);
            this.characters = this.set.characters;

            $scope.cardCount = function (cards) {
                owned = 0;

                angular.forEach(cards, function (card) {
                    if ($scope.owned && $scope.owned[$stateParams.setName + '-cards-' + card.number]) {
                        owned++;
                    }
                });

                return owned + " / " + cards.length;
            };

        }
    ])

    .controller('DetailsCtrl', ['$scope', '$stateParams', '$ionicScrollDelegate', 'Sets',
        function($scope, $stateParams, $ionicScrollDelegate, Sets) {
            this.set_name = $stateParams.setName;
            this.set = Sets.find(this.set_name);
            this.character_name = $stateParams.characterName;
            this.character = Sets.findCharacter(this.name, this.character_name);
            this.cards = this.character.cards;

            this.isEditing = false;



            this.enableEditing = function () {
                this.isEditing = !this.isEditing;
                $ionicScrollDelegate.scrollTop();
            };

            this.cardOwned = function (card) {
                if ($scope.owned && $scope.owned[$stateParams.setName + '-cards-' + card.number]) {
                    return true;
                }
                else {
                    return false;
                }
            };

            this.addDie = function () {

                if ($scope.owned[this.set_name + '-dice-' + this.character_name]) {
                    $scope.owned[this.set_name + '-dice-' + this.character_name]++;
                }
                else {
                    $scope.owned[this.set_name + '-dice-' + this.character_name] = 1;
                }

            };

            this.removeDie = function () {

                if ($scope.owned[this.set_name + '-dice-' + this.character_name] && $scope.owned[this.set_name + '-dice-' + this.character_name] > 0) {
                    $scope.owned[this.set_name + '-dice-' + this.character_name]--;
                }
                else {
                    $scope.owned[this.set_name + '-dice-' + this.character_name] = 0;
                }

            };

            $scope.raritySort = function(card) {
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



