angular.module('teams', ['collection', 'ionic', 'ui.router', 'LocalForageModule', 'providers', 'formatters'])

    .controller('TeamsCtrl', ['$scope', '$state', '$ionicPopup', 'Teams',
        function ($scope, $state, $ionicPopup, Teams) {

            this.showDelete = false;
            this.showReorder = false;

            this.toggleDelete = function () {
                this.showReorder = false;
                this.showDelete = !this.showDelete;
            };

            this.addTeam = function () {
                var uuid = Teams.new();
                $state.go('tabs.edit', { uuid: uuid });
            };

            this.deleteTeam = function (team) {
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Deleting ' + team.name,
                    template: 'Are you sure you want to delete this team?'
                });

                confirmPopup.then(function(res) {
                    if (res) {
                        Teams.remove(team);
                    }
                });

            };

            this.totalCards = function (team) {
                return Teams.totalCards(team);
            };

            this.totalDice = function (team) {
                return Teams.totalDice(team);
            };

        }
    ])
    .controller('ShowCtrl', ['$scope', '$stateParams', 'Teams', 'Sets',
        function($scope, $stateParams, Teams, Sets) {

            $scope.team = Teams.find($stateParams.uuid);

            this.basicCards = function () {
                return Teams.basicCards($scope.team);
            };

            this.teamCards = function () {
                return Teams.teamCards($scope.team);
            };

        }
    ])
    .controller('EditCtrl', ['$scope', '$stateParams', '$state', 'Teams',
        function($scope, $stateParams, $state, Teams) {

            $scope.team = Teams.find($stateParams.uuid);

            this.finish = function () {
                $state.go('tabs.show', { uuid: $scope.team.uuid });
            };

            this.totalCards = function () {
                return Teams.totalCards($scope.team);
            };

            this.totalDice = function () {
                return Teams.totalDice($scope.team);
            };

        }
    ])
    .controller('CardsCtrl', ['$scope', '$stateParams', '$state', 'Sets', 'Teams',
        function($scope, $stateParams, $state, Sets, Teams) {

            $scope.team = Teams.find($stateParams.uuid);
            this.cards = Sets.characterCards();

            $scope.getCardHeight = function (card) {
                return card.isCharacter ? 40 : 53;
            };

            $scope.getCardWidth = function (card) {
                return '100%';
            };

            this.finish = function () {
                $state.go('tabs.edit', { uuid: $scope.team.uuid });
            };

        }
    ])
    .controller('DiceCtrl', ['$scope', '$stateParams', '$state', 'Teams',
        function($scope, $stateParams, $state, Teams) {

            $scope.team = Teams.find($stateParams.uuid);

            this.finish = function () {
                $state.go('tabs.edit', { uuid: $scope.team.uuid });
            };

            this.teamCards = function () {
                return Teams.teamCards($scope.team);
            };

            this.addDie = function (card) {
                Teams.addDie($scope.team, card);
            };

            this.removeDie = function (card) {
                Teams.removeDie($scope.team, card);
            };

        }
    ]);



