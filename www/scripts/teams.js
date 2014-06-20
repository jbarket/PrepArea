angular.module('teams', ['collection', 'ionic', 'ui.router', 'providers', 'formatters'])
    .config(function($stateProvider) {

        $stateProvider
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
                url: '/teams/show/:id',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/show.html',
                        controller: 'ShowCtrl as showCtrl'
                    }
                }
            })
            .state('tabs.team_card_art', {
                url: '/teams/art/:id',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/art.html',
                        controller: 'TeamArtCtrl as teamArtCtrl'
                    }
                }
            })
            .state('tabs.team_edit', {
                url: '/teams/edit/:id',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/edit.html',
                        controller: 'EditCtrl as editCtrl'
                    }
                }
            })
            .state('tabs.cards', {
                url: '/teams/cards/:id',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/cards.html',
                        controller: 'CardsCtrl as cardsCtrl'
                    }
                }
            })
            .state('tabs.dice', {
                url: '/teams/dice/:id',
                views: {
                    'teams-tab': {
                        templateUrl: 'views/teams/dice.html',
                        controller: 'DiceCtrl as diceCtrl'
                    }
                }
            });
    })

    .controller('TeamsCtrl', ['$scope', '$state', '$ionicPopup', 'Teams', 'LoaderService',
        function ($scope, $state, $ionicPopup, Teams, LoaderService) {
            var self = this;

            self.showDelete = false;
            self.showReorder = false;

            LoaderService.show();

            Teams.all().then(function (data) {
                self.teams = data.rows;
                LoaderService.hide();
            });

            this.showDelete = false;
            this.showReorder = false;

            this.toggleDelete = function () {
                this.showReorder = false;
                this.showDelete = !this.showDelete;
            };

            this.basicCount = function (team) {
                return Teams.basicCount(team);
            };

            this.cardCount = function (team) {
                return Teams.cardCount(team);
            };

            this.diceCount = function (team) {
                return Teams.diceCount(team);
            };

            this.addTeam = function () {
                Teams.new().then(function(team)
                {
                    $state.go('tabs.team_edit', { id: team.id });
                });

            };

            this.deleteTeam = function (team) {

                var confirmPopup = $ionicPopup.confirm({
                    title: 'Deleting ' + team.doc.name,
                    template: 'Are you sure you want to delete this team?'
                });

                confirmPopup.then(function(res) {
                    if (res) {
                        Teams.remove(team.doc).then(function (data) {
                            self.teams.splice(self.teams.indexOf(team), 1);
                        }, function (err) {
                            console.log("[DB] ERR " + err);
                        });
                    }
                });

            };

        }
    ])
    .controller('ShowCtrl', ['$scope', '$stateParams', 'Teams', 'Sets', 'LoaderService',
        function($scope, $stateParams, Teams, Sets, LoaderService) {
            var self = this;

            LoaderService.show();

            Teams.find($stateParams.id).then(function (team) {
                self.team = team;

                Teams.cardsForTeam(team).then(function (data) {
                    self.card_groups = data;
                    LoaderService.hide();
                });
            });



            this.basicCount = function (team) {
                return Teams.basicCount(team);
            };

            this.cardCount = function (team) {
                return Teams.cardCount(team);
            };

            this.diceCount = function (team) {
                return Teams.diceCount(team);
            };
        }
    ])

    .controller('TeamArtCtrl', ['$scope', '$stateParams', '$state', 'Sets', 'LoaderService',
        function($scope, $stateParams, $state, Sets, LoaderService) {
            var self = this;

            LoaderService.show();

            Sets.findCard($stateParams.id).then(function (data) {
                self.card = data;
                LoaderService.hide();
            });

        }
    ])

    .controller('EditCtrl', ['$scope', '$stateParams', '$state', '$ionicPopup',
        'Sets', 'Teams', 'LoaderService',
        function($scope, $stateParams, $state, $ionicPopup, Sets, Teams, LoaderService) {
            var self = this;
            self.card_groups = Sets.parseForRepeat($scope.card_groups);

            LoaderService.show();

            Teams.find($stateParams.id).then(function (team) {
                self.team = team;
                LoaderService.hide();
            });



            this.teamHasCard = function (card) {
               return self.team.set_cards[card.type + '-' + card._id];
            };


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

            $scope.showTeamCardModal = function (card) {
                $scope.card = card;
                $scope.team = self.team;

                var cardModal = $ionicPopup.show({
                    templateUrl: 'views/teams/modal_card.html',
                    title: $scope.card.name,
                    scope: $scope,
                    buttons: [

                        {
                            text: '<b>Save</b>',
                            type: 'button-positive',
                            onTap: function(e) {
                                Teams.save($scope.team).then(function (data) {
                                }, function (err) {
                                    console.log("ERR: " + err);
                                });
                            }
                        }
                    ]
                });


            };

            $scope.showTeamNameModal = function () {
                $scope.team = self.team;

                var cardModal = $ionicPopup.show({
                    templateUrl: 'views/teams/modal_name.html',
                    title: "Rename Team",
                    scope: $scope,
                    buttons: [

                        {
                            text: '<b>Save</b>',
                            type: 'button-positive',
                            onTap: function(e) {
                                Teams.save($scope.team);
                            }
                        }
                    ]
                });

            };

            this.addDie = function (card) {
                return Teams.addDie(self.team, card);
            };

            this.removeDie = function (card) {
                return Teams.removeDie(self.team, card);
            };

            this.basicCount = function (team) {
                return Teams.basicCount(team);
            };

            this.cardCount = function (team) {
                return Teams.cardCount(team);
            };

            this.diceCount = function (team) {
                return Teams.diceCount(team);
            };

        }

    ]);



