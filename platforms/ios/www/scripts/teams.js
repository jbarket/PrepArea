angular.module('teams', ['collection', 'ionic', 'ui.router', 'LocalForageModule', 'providers', 'formatters'])

    .controller('TeamsCtrl', ['$scope', '$state', '$ionicPopup',
        function ($scope, $state, $ionicPopup) {


            this.showDelete = false;
            this.showReorder = false;

            this.toggleDelete = function () {
                this.showReorder = false;
                this.showDelete = !this.showDelete;
            };

            this.addTeam = function () {
                var team = { name: "New Team", set_cards: {}, dice: {} };
                $scope.teams.push(team);
                var team_index = $scope.teams.indexOf(team);
                $state.go('tabs.show', { teamIndex: team_index, isNew: true });
            };

            this.deleteTeam = function (team) {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Deleting ' + team.name,
                    template: 'Are you sure you want to delete this team?'
                });

                confirmPopup.then(function(res) {
                    if(res) {
                        $scope.teams.splice($scope.teams.indexOf(team), 1);
                    } else {
                    }
                });

            };



            this.totalCards = function (team) {
                total = 0;

                angular.forEach(team.set_cards, function (value, set_card) {
                    if (value) {
                        total++;
                    }
                });

                return total;
            };

            this.totalDice = function (team) {
                var total = 0;

                angular.forEach(team.set_cards, function (value, set_card) {
                    if (value) {
                        var dice = team.dice[set_card];

                        if (dice) {
                            total += dice;
                        }
                    }
                });

                return total;
            };

        }
    ])
    .controller('ShowCtrl', ['$scope', '$stateParams', '$ionicScrollDelegate', 'Sets',
        function($scope, $stateParams, $ionicScrollDelegate, Sets) {

            this.team_index = $stateParams.teamIndex;
            $scope.team = $scope.teams[$stateParams.teamIndex];
            this.characters = Sets.characterCards();

            this.isShow = true;
            this.isEditing = false;
            this.isManagingCards = false;
            this.isManagingDice = false;

            this.teamCards = function () {
                var cards = [];

                angular.forEach($scope.team.set_cards, function (value, set_card) {

                    if (value) {
                        // split at last -
                        var n = set_card.lastIndexOf('-');
                        var cardNumber = set_card.substring(n + 1);
                        var setName = set_card.substring(0, n);
                        var card = Sets.findCardBySetAndNumber(setName, cardNumber);

                        if (card)
                            cards.push(card);
                    }
                });

                return cards;
            };

            this.enableEditing = function () {
                this.isShow = false;
                this.isManagingCards = false;
                this.isManagingDice = false;
                this.isEditing = true;
                $ionicScrollDelegate.scrollTop();
            };

            this.enableCards = function () {
                this.isEditing = false;
                this.isShow = false;
                this.isManagingDice = false;
                this.isManagingCards = true;
                $ionicScrollDelegate.scrollTop();
            };

            this.enableDice = function () {
                this.isEditing = false;
                this.isShow = false;
                this.isManagingCards = false;
                this.isManagingDice = true;
                $ionicScrollDelegate.scrollTop();
            };

            this.finishEditing = function () {
                this.isEditing = false;
                this.isManagingCards = false;
                this.isManagingDice = false;
                this.isShow = true;
                $ionicScrollDelegate.scrollTop();
            };

            this.finishCards = function () {
                this.isShow = false;
                this.isManagingCards = false;
                this.isManagingDice = false;
                this.isEditing = true;
                $ionicScrollDelegate.scrollTop();
            };

            this.finishDice = function () {
                this.isShow = false;
                this.isManagingCards = false;
                this.isManagingDice = false;
                this.isEditing = true;
                $ionicScrollDelegate.scrollTop();
            };

            this.totalCards = function () {
                total = 0;

                angular.forEach($scope.team.set_cards, function (value, set_card) {
                    if (value) {
                        total++;
                    }
                });

                return total;
            };

            this.totalDice = function () {
                var total = 0;

                angular.forEach($scope.team.set_cards, function (value, set_card) {
                    if (value) {
                        var dice = $scope.team.dice[set_card];

                        if (dice) {
                            total += dice;
                        }
                    }
                });

                return total;
            };

            this.addDie = function (natural_key) {
                if (!$scope.team.dice[natural_key]) {
                    $scope.team.dice[natural_key] = 1;
                }
                else {
                    $scope.team.dice[natural_key]++;
                }

            };

            this.removeDie = function (natural_key) {
                if (!$scope.team.dice[natural_key]) {
                    $scope.team.dice[natural_key] = 0;
                }
                else if ($scope.team.dice[natural_key] > 0) {
                    $scope.team.dice[natural_key]--;
                }

            };

            if (!this.isNew && $stateParams.isNew) {
                this.enableEditing();
                this.isNew = false;
            }

        }
    ]);


