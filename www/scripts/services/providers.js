angular.module('providers', ['pouchdb'])
    .factory('PrepAreaDB', function (pouchdb) {
        var PrepAreaDB = {
            db: function () {
                console.log("[DB] Instantiating system database.");
                return pouchdb.create('setData');
            }

        };

        return PrepAreaDB;
    })
    .factory('Owned', function(pouchdb, $q, Sets, Teams, $localForage) {

        var Owned = {
            setup: function() {
                var deferred = $q.defer();

                Sets.checkSeedPouch().then(function () {

                    $localForage.get('teams').then(function(data) {

                        if (data) {

                            console.log("[LF] Found existing teams data in local forage. Converting.");

                            var teamsProm = [];
                            var ts = [];

                            angular.forEach(data, function (team, index) {

                                ts[index] = {
                                    name: team.name,
                                    type: 'team',
                                    set_cards: {},
                                    dice: {}
                                };

                                angular.forEach(team.set_cards, function (value, key) {
                                    if (value) {
                                        var cardNumb = key.split(/-/)[2];

                                        teamsProm.push(Sets.findCardByNumber(cardNumb).then(function (card_data) {
                                            ts[index].set_cards[card_data.rows[0].key[1] + '-' + card_data.rows[0].key[0]] = true;
                                        }, function (err) {
                                            console.log(err);
                                        }));

                                    }
                                });

                                angular.forEach(team.dice, function (value, key) {
                                    if (value) {
                                        var cardNumb = key.split(/-/)[2];

                                        teamsProm.push(Sets.findCardByNumber(cardNumb).then(function (card_data) {
                                            ts[index].dice[card_data.rows[0].key[0]] = value;
                                        }, function (err) {
                                            console.log(err);
                                        }));

                                    }
                                });

                            });

                            $q.all(teamsProm).then(function () {

                                console.log("[LF] All teams found.");

                                var teamSaveProms = [];

                                angular.forEach(ts, function (t) {
                                    teamSaveProms.push(Teams.create(t));
                                });

                                $q.all(teamSaveProms).then(function () {
                                    console.log("[DB] Inserted data from local forage.");
                                    console.log("[LF] Removing local forage team data.");
                                    $localForage.removeItem('teams');
                                });

                            });



                        }
                    });


                    Owned.guarantee().then(function () {

                        $localForage.get('owned').then(function(data) {
                            if (data) {

                                Owned.find().then(function (owned_data) {
                                    var owned = owned_data;
                                    var ownedProm = [];

                                    console.log("[LF] Found existing owned data in local forage. Converting.");

                                    angular.forEach(data, function (value, key) {
                                        if (value) {
                                            var cardType = key.split(/-/)[2];
                                            var cardNumb = key.split(/-/)[3];

                                            if (cardType == 'cards') {
                                                ownedProm.push(Sets.findCardByNumber(cardNumb).then(function (card_data) {
                                                    owned['cards-' + card_data.rows[0].key[0]] = 1;
                                                }, function (err) {
                                                    console.log(err);
                                                }));

                                            }
                                            else if (cardType == 'dice') {
                                                ownedProm.push(Sets.findCharacterByName(cardNumb).then(function (card_data) {
                                                    owned['avx-dice-' + card_data.rows[0].key] = value;
                                                }, function (err) {
                                                    console.log(err);
                                                }));
                                            }
                                        }
                                    });

                                    $q.all(ownedProm).then(function () {

                                        Owned.save(owned).then(function (data) {
                                            console.log("[DB] Inserted data from local forage.");
                                            console.log("[LF] Removing local forage owned data.");
                                            $localForage.removeItem('owned');
                                            deferred.resolve();
                                        }, function (err) {
                                            console.log("[DB] ERR: " + err);
                                            deferred.resolve(err);
                                        });
                                    });



                                });


                            }
                            else {
                                deferred.resolve();
                            }
                        });

                    });
                });

                return deferred.promise;

            },
            create: function () {
                var db = pouchdb.create('setData');
                return db.put({}, 'owned');
            },
            find: function () {
                var db = pouchdb.create('setData');
                return db.get('owned');
            },
            guarantee: function () {
                var deferred = $q.defer();

                Owned.find().then(function (data) {
                    console.log("[DB] Owned data found.");
                    deferred.resolve("Data already existed.");
                }, function (err) {
                    if (err && err.status === 404) {
                        console.log("[DB] Owned data not found, creating.");
                        Owned.create().then(function () {
                            deferred.resolve("Data not found, created.");
                        });
                    }
                });

                return deferred.promise;
            },
            save: function (object) {
                var db = pouchdb.create('setData');
                var deferred = $q.defer();

                var clone = angular.copy(object);

                console.log("[DB] Retrieving existing owned document to replace it.");
                db.get('owned').then(function (doc) {
                    console.log("[DB] Found existing owned document.");
                    clone._rev = doc._rev;

                    db.put(clone).then(function (data) {
                        console.log("[DB] Replaced owned data with new data");
                        deferred.resolve();
                    }, function (err) {
                        console.log("[DB] ERR: " + err);
                    });
                });

                return deferred.promise;
            }
        };

        return Owned;

    })
    .factory('Sets', function(pouchdb, $q, $rootScope) {


        var dataVersion = '0.2.9';

        var Set = {
            all: function () {
                var db = pouchdb.create('setData');
                return db.query('set_index', { include_docs: true });
            },
            find: function (id) {
                var deferred = $q.defer();
                var foundSet = '';

                angular.forEach($rootScope.sets, function (set) {
                    if (set.id === id) {
                        foundSet = set;
                    }
                });

                deferred.resolve(foundSet);
                return deferred.promise;
            },
            parseForRepeat: function (data) {
                var flatData = [];

                angular.forEach(data, function (grouping) {
                    flatData.push(grouping);

                    angular.forEach(grouping.doc.cards, function (card) {
                        flatData.push(card);
                    });
                });

                return flatData;
            },

            findCard: function (cardId) {
                var deferred = $q.defer();

                angular.forEach($rootScope.card_groups, function (card_group) {

                    angular.forEach(card_group.doc.cards, function (card) {
                        if (card._id === cardId) {
                            deferred.resolve(card);
                        }
                    });

                });


                deferred.resolve();

                return deferred.promise;

            },
            findCardByNumber: function (cardNumb) {
                var db = pouchdb.create('setData');
                return db.query(
                    function (doc, emit) {
                        if ((doc.type === 'basics' && doc.set === 'avx') || (doc.type === 'character' && doc.sets.indexOf('avx') != -1)) {
                            for (var i in doc.cards) {
                                if (doc.cards[i].number == cardNumb) {
                                    emit([doc.cards[i]._id, doc.cards[i].type]);
                                }
                            }

                        }

                    }
                );
            },
            findCharacterByName: function (cardNumb) {
                var db = pouchdb.create('setData');
                return db.query(
                    function (doc, emit) {
                        if (doc.type === 'character' && doc.sets.indexOf('avx') != -1 && doc.name === cardNumb) {
                            emit(doc._id);
                        }
                    }
                );
            },
            cardsByCharacterForSet: function (setId) {
                var deferred = $q.defer();

                var matches = [];

                angular.forEach($rootScope.card_groups, function (row) {

                    if ((row.doc.type === 'basics' && row.doc.set === setId) || (row.doc.type === 'character' && row.doc.sets.indexOf(setId) != -1))
                    {
                        matches.push(row);
                    }

                });

                deferred.resolve(matches);


                return deferred.promise;

            },
            cardsByCharacter: function () {
                var db = pouchdb.create('setData');
                return db.query('cards_by_character_index', { include_docs: true });
            },
            checkSeedPouch: function () {
                var deferred = $q.defer();

                var db = pouchdb.create('setData');
                db.get('metadata').then(
                    function (data) {

                        if (data.version < dataVersion) {
                            console.log("[DB] Data is out of date. Seeding Pouch.");
                            Set.seedPouch().then(function (res) {
                                console.log("[DB] Pouch seeded");
                                deferred.resolve("[DB] Pouch seeded");
                            }, function (err) {
                                console.log("[DB] ERR -" + err);
                                deferred.reject();
                            });
                        }
                        else {
                            console.log("[DB] Data is up to date.");
                            deferred.resolve();
                        }

                    },
                    function (err) {
                        // no data, so seed
                        Set.seedPouch().then(function (res) {
                            deferred.resolve("[DB] Pouch seeded");
                        }, function (err) {
                            deferred.reject("[DB] ERR -" + err);
                        });
                    }
                );

                return deferred.promise;


            },
            seedPouch: function () {

                var db = pouchdb.create('setData');
                var deferred = $q.defer();

                var seedData = [
                    {
                        _id: '_design/set_index',
                        type: 'stored_view',
                        views: {
                            'set_index': {
                                map: function (doc) {
                                    if (doc.type === 'set') {
                                        emit(doc.name);
                                    }
                                }.toString()
                            }
                        }
                    },
                    {
                        _id: '_design/team_index',
                        type: 'stored_view',
                        views: {
                            'team_index': {
                                map: function (doc) {
                                    if (doc.type === 'team') {
                                        emit(doc.name);
                                    }
                                }.toString()
                            }
                        }
                    },
                    {
                        _id: '_design/cards_by_character_index',
                        type: 'stored_view',
                        views: {
                            'cards_by_character_index': {
                                map: function (doc) {
                                    if (doc.type === 'basics')
                                    {
                                        emit([0, 'Basic Action Cards', doc.type, doc._id]);
                                    }

                                    if (doc.type === 'character') {
                                        emit([1, doc.name, doc.type, doc._id]);
                                    }
                                }.toString()
                            }
                        }
                    },
                    {
                        _id: '_design/cards_index',
                        type: 'stored_view',
                        views: {
                            'cards_index': {
                                map: function (doc) {
                                    if (doc.type === 'basics' || doc.type === 'character')
                                    {
                                        for (var i in doc.cards) {
                                            emit(doc.cards[i]);
                                        }

                                    }
                                }.toString()
                            }
                        }
                    },


                { _id: "metadata", version: '0.2.9' },
                    { _id: 'op', type: 'set', name: 'Organized Play', release_date: '' },
                    {
                        _id: "op_basics",
                        type: 'basics',
                        set: 'op',
                        cards: [
                            { _id: "op_basic_1", type: 'basic', set: 'op', "number": 1, "name": "Teamwork", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "Each of your fielded characters gains +1A and +1D for each other of your fielded characters that shares a team affiliation with it.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "op_basic_2", type: 'basic', set: 'op', "number": 2, "name": "Rally", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "Move up to 2 Sidekicks from your used pile to the field.", "ability_burst": "", "ability_double_burst": "Move 3 Sidekicks instead.", "ability_global": ""},
                        ]
                    },

                    { _id: 'avx', type: 'set', name: 'Avengers vs. X-Men', release_date: '4/23/2014' },

                    { 
                        _id: "avx_basics", 
                        type: 'basics', 
                        set: 'avx',
                        cards: [
                            { _id: "avx_basic_25", type: 'basic', set: 'avx', "number": 25, "name": "Distraction", "cost": 4, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Your opponent targets two of his or her characters. Those characters cannot block (this turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Mask] to remove one attacker from the attack zone to the field."},
                            { _id: "avx_basic_26", type: 'basic', set: 'avx', "number": 26, "name": "Focus Power", "cost": 4, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Spin one target character up or down one level.", "ability_burst": "Spin another target character up or down one level.", "ability_double_burst": "", "ability_global": ""},
                            { _id: "avx_basic_27", type: 'basic', set: 'avx', "number": 27, "name": "Force Beam", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Deal 1 damage to each character (including yours).", "ability_burst": "Instead, deal 2 damage to each character.", "ability_double_burst": "Instead, deal 1 damage to each player and 2 damage to each character.", "ability_global": ""},
                            { _id: "avx_basic_28", type: 'basic', set: 'avx', "number": 28, "name": "Gearing Up", "cost": 4, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Draw two dice from your bag and roll them (place them in your reserve pool).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_basic_29", type: 'basic', set: 'avx', "number": 29, "name": "Inner Rage", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Two of your target characters get +1A and +1D (until the end of the turn).", "ability_burst": "Those characters get an additional +1A and +1D.", "ability_double_burst": "Those characters get an additional +1A and +1D.", "ability_global": ""},
                            { _id: "avx_basic_30", type: 'basic', set: 'avx', "number": 30, "name": "Invulnerability", "cost": 2, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Your attacking characters that are knocked out (this turn) return to the field.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Bolt]. One target character gets +1A (until the end of the turn)."},
                            { _id: "avx_basic_31", type: 'basic', set: 'avx', "number": 31, "name": "Power Bolt", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Deal 2 damage to one target character or player.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_basic_32", type: 'basic', set: 'avx', "number": 32, "name": "Smash!", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Knock out a target level 1 character.", "ability_burst": "", "ability_double_burst": "Knock out a level 1 or level 2 character instead.", "ability_global": "Pay [1 Fist]. Target blocked character deals no damage."},
                            { _id: "avx_basic_33", type: 'basic', set: 'avx', "number": 33, "name": "Take Cover", "cost": 3, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Your characters get +2D.", "ability_burst": "One character gets an extra +3D.", "ability_double_burst": "One character gets an extra +3D.", "ability_global": "Pay [1 Shield] to give one targer character +1D (until the end of the turn)."},
                            { _id: "avx_basic_34", type: 'basic', set: 'avx', "number": 34, "name": "Thrown Car", "cost": 4, "cost_type": "Generic", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "Y", "ability": "Two of your attacking characters get +1A. While attacking, damage those two characters deal in excess of the total defense of blocking characters is dealt to your opponent.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                            
                        ]
                    },
                    
                    {
                        _id: "character_angel",
                        type: 'character',
                        sets: ['avx'],
                        name: 'Angel',
                        dice: 'assets/avx/dice/angel.jpg',
                        cards: [
                            { _id: "avx_card_35", type: 'card', set: 'avx', "number": 35, "name": "High Ground", "cost": 3, "cost_type": "Shield", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "Angel cannot be blocked by a character with a lower level.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_65", type: 'card', set: 'avx', "number": 65, "name": "Avenging Angel", "cost": 3, "cost_type": "Shield", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "If Angel is blocked but is not knocked out, he deals 2 damage to the opposing player.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_99", type: 'card', set: 'avx', "number": 99, "name": "Soaring", "cost": 2, "cost_type": "Shield", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "If you used an action this turn, Angel cannot be blocked.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]
                    },
                    {
                        _id: "character_beast",
                        type: 'character',
                        sets: ['avx'],
                        name: 'Beast',
                        dice: 'assets/avx/dice/beast.jpg',
                        cards: [
                            { _id: "avx_card_1",  type: 'card', set: 'avx', "number": 1, "name": "Big Boy Blue", "cost": 2, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "Beast gets +1A and +1D (until the end of the turn) when he blocks.", "ability_burst": "He gets +2A and +2D instead.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_2",  type: 'card', set: 'avx', "number": 2, "name": "Genetic Expert", "cost": 2, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "If Beast is knocked out while blocking, you gain 1 life.", "ability_burst": "Your opponent also takes 2 damage.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_3",  type: 'card', set: 'avx', "number": 3, "name": "Mutate #666", "cost": 2, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When Beast blocks, draw one die and place it in your prep area.", "ability_burst": "Instead draw 2 dice; place one in your prep area and the other in your used pile.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_66", type: 'card', set: 'avx', "number": 66, "name": "Kreature", "cost": 3, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "When Beast blocks, spin the blocked character down 1 level. If it is already level 1, it is knocked out.", "ability_burst": "If the blocked character is knocked out by this, gain 2 life.", "ability_double_burst": null, "ability_global": ""}
                        ]
                    },
                    {
                        _id: "character_black_widow",
                        type: 'character',
                        sets: ['avx'],
                        name: 'Black Widow',
                        dice: 'assets/avx/dice/black_widow.jpg',
                        cards: [
                            { _id: "avx_card_36",  type: 'card', set: 'avx', "number": 36, "name": "Natural", "cost": 2, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "At the end of the attack step, spin each character engaged with Black Widow down 1 level (this happens before damage clears).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_100", type: 'card', set: 'avx', "number": 100, "name": "Killer Instinct", "cost": 2, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, spin one target opponent's character down to level 1.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_129", type: 'card', set: 'avx', "number": 129, "name": "Tsarina", "cost": 2, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Super-Rare", "die_limit": 4, "starter": "", "ability": "When Black Widow attacks, she deals 2 damage to your opponent. Your opponent can prevent this by spinning one of his or her characters down one level.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_captain_america", type: 'character', sets: ['avx'], name: 'Captain America',
                        cards: [
                            { _id: "avx_card_4",  type: 'card', set: 'avx', "number": 4, "name": "American Hero", "cost": 4, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When fielded, you may roll a Sidekick die from your used pile (you cannot select a die that paid to field this one; place the die in your reserve pool).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_5",  type: 'card', set: 'avx', "number": 5, "name": "Natural Leader", "cost": 4, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "While Captain America is active, your Sidekick characters get +1A and +1D (no matter how many Captain America dice you have fielded).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_6",  type: 'card', set: 'avx', "number": 6, "name": "Star-Spangled Avenger", "cost": 5, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When fielded, knock out each of your opponent's Sidekick characters. Gain 1 life for each Sidekick knocked out this way.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_67", type: 'card', set: 'avx', "number": 67, "name": "Sentinel of Liberty", "cost": 6, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "While Captain America is active, your Sidekick characters get +2A, and your opponent's Sidekick characters cost 1 extra energy to field.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_colossus", type: 'character', sets: ['avx'], name: 'Colossus',
                        cards: [
                            { _id: "avx_card_37",  type: 'card', set: 'avx', "number": 37, "name": "Unstoppable", "cost": 6, "cost_type": "Fist", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "At the end of your turn, spin each of your Colossus in the field up one level.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_68",  type: 'card', set: 'avx', "number": 68, "name": "Russian Bear", "cost": 7, "cost_type": "Fist", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "", "ability_burst": "If Colossus damaged your opponent, return Colossus to the prep area instead of the used pile.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_101", type: 'card', set: 'avx', "number": 101, "name": "Piotr Rasputin", "cost": 7, "cost_type": "Fist", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "While Colossus is active, at the end of your turn, each of your characters of level 2 or higher deals 2 damage to your opponent (not 2 damage per Colossus die).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_cyclops", type: 'character', sets: ['avx'], name: 'Cyclops',
                        cards: [
                            { _id: "avx_card_38",  type: 'card', set: 'avx', "number": 38, "name": "Slim", "cost": 5, "cost_type": "Bolt", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When Cyclops is blocked by more than one character, he deals full damage to each character blocking him (instead of having to split it).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_69",  type: 'card', set: 'avx', "number": 69, "name": "If Looks Could Kill", "cost": 7, "cost_type": "Bolt", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 2, "starter": "", "ability": "When Cyclops is assigned to attack, before blockers are assigned, he deals his attack in damage to each opposing character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_102", type: 'card', set: 'avx', "number": 102, "name": "Scott Summers", "cost": 7, "cost_type": "Bolt", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "If Cyclops is blocked, you may have him deal damage to your opponent instead of his blocker(s).  If you do so, he goes to your used pile during cleanup.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_deadpool", type: 'character', sets: ['avx'], name: 'Deadpool',
                        cards: [
                            { _id: "avx_card_39",  type: 'card', set: 'avx', "number": 39, "name": "Assassin", "cost": 4, "cost_type": "Fist", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When Deadpool attacks, you may assign an opposing character to block him.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_70",  type: 'card', set: 'avx', "number": 70, "name": "Jack", "cost": 5, "cost_type": "Fist", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "When Deadpool attacks, you may assign an opposing character to block him. At the end of the turn, knock out that character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_103", type: 'card', set: 'avx', "number": 103, "name": "Chiyonosake", "cost": 5, "cost_type": "Fist", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When Deadpool attacks, you may assign an opposing character to block him. If he knocks out that character, he deals 2 damage to each opposing character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_doctor_doom", type: 'character', sets: ['avx'], name: 'Doctor Doom',
                        cards: [
                            { _id: "avx_card_40",  type: 'card', set: 'avx', "number": 40, "name": "Reed Richards' Rival", "cost": 5, "cost_type": "Shield", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "While Doctor Doom is active, each non-Villain character gets -1A and -1D (no matter how many Doctor Doom dice you have fielded).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_71",  type: 'card', set: 'avx', "number": 71, "name": "Nemesis", "cost": 6, "cost_type": "Shield", "affiliation": "Villains", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "Doctor Doom can only be blocked by Villain and Sidekick characters.", "ability_burst": "", "ability_double_burst": null, "ability_global": "If you have a Villain fielded, pay [1 Shield] to give a target character -1A and -1D (knock out those with zero defense)."},
                            { _id: "avx_card_104", type: 'card', set: 'avx', "number": 104, "name": "Victor", "cost": 6, "cost_type": "Shield", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, each player must knock out all but one of his or her non-Villain characters (place those knocked out dice in that player's prep area).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_doctor_octopus", type: 'character', sets: ['avx'], name: 'Doctor Octopus',
                        cards: [
                            { _id: "avx_card_41",  type: 'card', set: 'avx', "number": 41, "name": "Megalomaniac", "cost": 6, "cost_type": "Shield", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When Doctor Octopus assigns to attack, target an opposing character. That character cannot block (this turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_72",  type: 'card', set: 'avx', "number": 72, "name": "Fully Armed", "cost": 6, "cost_type": "Shield", "affiliation": "Villains", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "When blocked, any damage that Doctor Octopus does in excess of this blocking characters' total defense is dealt to your opponent.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_105", type: 'card', set: 'avx', "number": 105, "name": "Mad Scientist", "cost": 6, "cost_type": "Shield", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When Doctor Octopus is blocked by more than one character, he deals his full attack value in damage to each character blocking him (instead of having to split it).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_doctor_strange", type: 'character', sets: ['avx'], name: 'Doctor Strange',
                        cards: [
                            { _id: "avx_card_42",  type: 'card', set: 'avx', "number": 42, "name": "Sorcerer Supreme", "cost": 7, "cost_type": "Mask", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "While Doctor Strange is active, you may purchase one action die for free during your main step (not one action die per Doctor Strange die).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_73",  type: 'card', set: 'avx', "number": 73, "name": "Master of the Mystic Arts", "cost": 6, "cost_type": "Mask", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "While Doctor Strange is active, each time you use an action he deals 2 damage to a character or opponent (no matter how many dice are fielded).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_106", type: 'card', set: 'avx', "number": 106, "name": "Probably a Charlatan", "cost": 7, "cost_type": "Mask", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, search your bag for an action die and roll it (place it into your reserve pool).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_gambit", type: 'character', sets: ['avx'], name: 'Gambit',
                        cards: [
                            { _id: "avx_card_43",  type: 'card', set: 'avx', "number": 43, "name": "Ace in the Hole", "cost": 3, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When fielded, you may draw and roll one die (place it in your reserve pool). ", "ability_burst": "Instead draw 2 dice, roll one of them and return the other to your bag.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_74",  type: 'card', set: 'avx', "number": 74, "name": "Le Diable Blanc", "cost": 5, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "When fielded, draw and roll 2 dice. Field characters rolled on those dice for free; place the rest in your used pile.", "ability_burst": "Instead draw 3 dice, choose two to roll and return the other to your bag.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_107", type: 'card', set: 'avx', "number": 107, "name": "Cardsharp", "cost": 5, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, you may draw and roll one die.  If you roll a character side, that character deals damage equal to its attack to your opponent and goes to your used pile (otherwise, the die goes to your reserve pool).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_ghost_rider", type: 'character', sets: ['avx'], name: 'Ghost Rider',
                        cards: [
                            { _id: "avx_card_44",  type: 'card', set: 'avx', "number": 44, "name": "Johnny Blaze", "cost": 2, "cost_type": "Bolt", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "(No special effects; just a low-cost die with good numbers.)", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_75",  type: 'card', set: 'avx', "number": 75, "name": "Spirit of Vengeance", "cost": 4, "cost_type": "Bolt", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "If Ghost Rider is knocked out while engaged, draw one die from your bag and place it in your prep area.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_108", type: 'card', set: 'avx', "number": 108, "name": "Brimstone Biker", "cost": 4, "cost_type": "Bolt", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, select a die from your used pile and place it into your prep area (you cannot select a die that paid to field this die).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_green_goblin", type: 'character', sets: ['avx'], name: 'Green Goblin',
                        cards: [
                            { _id: "avx_card_45",  type: 'card', set: 'avx', "number": 45, "name": "Goblin-Lord", "cost": 3, "cost_type": "Bolt", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "While Green Goblin is active, your Sidekick characters get +1A and +1D (no matter how many Green Goblin dice you have fielded).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_109", type: 'card', set: 'avx', "number": 109, "name": "Norman Osborn", "cost": 4, "cost_type": "Bolt", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, you may roll up to 2 Sidekick dice from your used pile (you cannot roll dice that paid to field this dice; place rolled dice in your reserve pool).", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Bolt] and knock out one of your sidekick characters to deal 2 damage to target character."},
                            { _id: "avx_card_130", type: 'card', set: 'avx', "number": 130, "name": "Gobby", "cost": 3, "cost_type": "Bolt", "affiliation": "Villains", "rarity": "Super-Rare", "die_limit": 4, "starter": "", "ability": "When fielded, Green Goblin deals 1 damage to your opponent for each Sidekick in the field (count your Sidekicks only).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_hawkeye", type: 'character', sets: ['avx'], name: 'Hawkeye',
                        cards: [
                            { _id: "avx_card_46",  type: 'card', set: 'avx', "number": 46, "name": "Longbow", "cost": 4, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "When fielded, Hawkeye deals his attack value in damage to a target opposing character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_76",  type: 'card', set: 'avx', "number": 76, "name": "Br'er Hawkeye", "cost": 3, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "Spin characters damaged by Hawkeye to level 1.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_110", type: 'card', set: 'avx', "number": 110, "name": "Robin Hood", "cost": 3, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When assigning damage in an attack step, Hawkeye assigns and resolves his damage before opposing characters.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_hulk", type: 'character', sets: ['avx'], name: 'Hulk',
                        cards: [
                            { _id: "avx_card_7",  type: 'card', set: 'avx', "number": 7, "name": "Anger Issues", "cost": 7, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "While Hulk is active, when either you or Hulk takes damage, Hulk gets +2A and +2D (until the end of the turn).", "ability_burst": "Hulk gets +3A and +3D instead.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_8",  type: 'card', set: 'avx', "number": 8, "name": "Annihilator", "cost": 6, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "While Hulk is active, when either you or Hulk takes damage, move all Hulk dice from your used pile to your prep area.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_9",  type: 'card', set: 'avx', "number": 9, "name": "Jade Giant", "cost": 6, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "While Hulk is active, when either you or Hulk takes damage, knock out one of your opponent's level 1 characters.", "ability_burst": "Instead, knock out one opposing character of any level.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_77", type: 'card', set: 'avx', "number": 77, "name": "Green Goliath", "cost": 6, "cost_type": "Fist", "affiliation": "Avengers", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "While Hulk is active, whenever either you or Hulk takes damage, Hulk deals 2 damage to each opposing character (no matter how many Hulks are fielded).", "ability_burst": "He deals 3 damage instead.", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_human_torch", type: 'character', sets: ['avx'], name: 'Human Torch',
                        cards: [
                            { _id: "avx_card_10", type: 'card', set: 'avx', "number": 10, "name": "Flame On!", "cost": 4, "cost_type": "Bolt", "affiliation": "Fantastic Four", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "While Human Torch is active, he deals 1 damage to a character or player each time you field a character (not 1 damage per die).", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Bolt] when you deal damage with an action die or global ability to deal one extra damage to one target."},
                            { _id: "avx_card_11", type: 'card', set: 'avx', "number": 11, "name": "Matchstick", "cost": 3, "cost_type": "Bolt", "affiliation": "Fantastic Four", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "While Human Torch is active, each time you field a character, you may roll one Human Torch from your used pile (not one that paid to field that die). If you roll a character side, place it in your reserve pool; otherwise place it in your used pile.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_12", type: 'card', set: 'avx', "number": 12, "name": "Playing with Fire", "cost": 2, "cost_type": "Bolt", "affiliation": "Fantastic Four", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "The first time you field a character each turn, each Human Torch already in the field gets +1A and +1D (until the end of the turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_78", type: 'card', set: 'avx', "number": 78, "name": "Johnny Storm", "cost": 4, "cost_type": "Bolt", "affiliation": "Fantastic Four", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "While Human Torch is active, each time you field a character, Human Torch deals 1 damage to your opponent and one to a target character (not 1 damage per Human Torch die).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_iron_man", type: 'character', sets: ['avx'], name: 'Iron Man',
                        cards: [
                            { _id: "avx_card_13", type: 'card', set: 'avx', "number": 13, "name": "Inventor", "cost": 4, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "Each time Iron Man takes damage, reduce the damage he takes by 1.", "ability_burst": "Reduce the damage by 2 instead.", "ability_double_burst": null, "ability_global": "Pay [1 Shield] to redirect 1 damage from you to one of your characters."},
                            { _id: "avx_card_14", type: 'card', set: 'avx', "number": 14, "name": "Philanthropist", "cost": 5, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "Each time Iron Man takes damage, you gain 1 life.", "ability_burst": "Gain 2 life instead.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_15", type: 'card', set: 'avx', "number": 15, "name": "Playboy", "cost": 4, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "Each time Iron Man takes damage in the attack step, he deals 3 damage to one opposing character that is attacking or blocking.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_79", type: 'card', set: 'avx', "number": 79, "name": "Billionaire", "cost": 6, "cost_type": "Shield", "affiliation": "Avengers", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "Iron Man takes no damage from non-[Shield] characters.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_loki", type: 'character', sets: ['avx'], name: 'Loki',
                        cards: [
                            { _id: "avx_card_47",  type: 'card', set: 'avx', "number": 47, "name": "Trickster", "cost": 6, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When fielded, capture an opposing die of equal or lower level (return it to your opponent's field at the end of the turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_80",  type: 'card', set: 'avx', "number": 80, "name": "Illusionist", "cost": 7, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Uncommon", "die_limit": 3, "starter": "", "ability": "When fielded, take control of an opposing character. At the end of the turn, knock out that character (place it in your opponent's prep area); it deals its damage equal to its attack to your opponent.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_111", type: 'card', set: 'avx', "number": 111, "name": "Gem-Keeper", "cost": 5, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, choose an opponent's character card, canceling all previous choices. Your opponent cannot field that character while Loki is active. This effect lasts until you field another Loki.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_magneto", type: 'character', sets: ['avx'], name: 'Magneto',
                        cards: [
                            { _id: "avx_card_48",  type: 'card', set: 'avx', "number": 48, "name": "Former Comrade", "cost": 5, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "Magneto gets +2A and +2D when engaged with an X-Men character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_81",  type: 'card', set: 'avx', "number": 81, "name": "Holocaust Survivor", "cost": 6, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "While Magneto is active, you may pay 2 energy to spin a Villain up one level.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Mask] to reroll a Villain die."},
                            { _id: "avx_card_112", type: 'card', set: 'avx', "number": 112, "name": "Sonderkommando", "cost": 6, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "While Magneto is active, your other Villain characters get +2A and +2D (no matter how many Magneto dice you have fielded).", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Mask] to reroll a Villain die."}
                        ]

                    },
                    {
                        _id: "character_mjolnir", type: 'character', sets: ['avx'], name: 'Mjolnir',
                        cards: [
                            { _id: "avx_card_63",  type: 'card', set: 'avx', "number": 63, "name": "Fist of the Righteous", "cost": 6, "cost_type": "Bolt", "affiliation": "", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "Deal 6 damage to each villain.", "ability_burst": "", "ability_double_burst": "Deal 8 damage to each villain instead.", "ability_global": "Pay [2 Bolt] to deal 1 damage to a target character."},
                            { _id: "avx_card_97",  type: 'card', set: 'avx', "number": 97, "name": "Forged by Odin", "cost": 6, "cost_type": "Bolt", "affiliation": "", "rarity": "Uncommon", "die_limit": 3, "starter": "", "ability": "Deal 5 damage to target character.", "ability_burst": "Deal an extra 1 damage.", "ability_double_burst": "Deal an extra 3 damage.", "ability_global": "Pay [2 Bolt] to deal 1 damage to a target character."},
                            { _id: "avx_card_127", type: 'card', set: 'avx', "number": 127, "name": "Thor's Hammer", "cost": 5, "cost_type": "Bolt", "affiliation": "", "rarity": "Rare", "die_limit": 3, "starter": "", "ability": "Deal 4 damage to all characters other than Thor (yours and your opponent's).", "ability_burst": "Deal 5 damage instead.", "ability_double_burst": null, "ability_global": "Pay [2 Bolt] to deal 1 damage to a target character."}
                        ]

                    },
                    {
                        _id: "character_mr_fantastic", type: 'character', sets: ['avx'], name: 'Mr. Fantastic',
                        cards: [
                            { _id: "avx_card_49",  type: 'card', set: 'avx', "number": 49, "name": "Brilliant Scientist", "cost": 3, "cost_type": "Mask", "affiliation": "Fantastic Four", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "Mr. Fantastic gets +2A and +2D while blocking.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Mask].  Target character must attack this turn."},
                            { _id: "avx_card_113", type: 'card', set: 'avx', "number": 113, "name": "The Invincible Man", "cost": 5, "cost_type": "Mask", "affiliation": "Fantastic Four", "rarity": "Rare", "die_limit": 3, "starter": "", "ability": "While blocking, you may redirect up to 2 damage from Mr. Fantastic to the character he blocks.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Mask].  Target character must attack this turn."},
                            { _id: "avx_card_131", type: 'card', set: 'avx', "number": 131, "name": "Elastic", "cost": 4, "cost_type": "Mask", "affiliation": "Fantastic Four", "rarity": "Super-Rare", "die_limit": 4, "starter": "", "ability": "You may spin Mr. Fantastic down 1 level to allow him to block an additional character (or 2 levels to block two additional characters).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_mystique", type: 'character', sets: ['avx'], name: 'Mystique',
                        cards: [
                            { _id: "avx_card_50",  type: 'card', set: 'avx', "number": 50, "name": "Unknown", "cost": 4, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When Mystique is engaged, she copies the die stats and card abilities of one character that she is engaged with.", "ability_burst": "She also gains an extra +1A and +1D.", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_82",  type: 'card', set: 'avx', "number": 82, "name": "Shapeshifter", "cost": 6, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "When fielded, choose an opponent's character card.  Mystique copies that card (except purchase cost and the die faces) until the next Mystique is fielded.", "ability_burst": "She also copies the die faces (matching level for level).", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_114", type: 'card', set: 'avx', "number": 114, "name": "Could Be Anyone", "cost": 5, "cost_type": "Mask", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "At the beginning of your turn, choose an opposing fielded character. Each of your Mystique dice copies the stats on that character's die until your next turn.", "ability_burst": "She also gains an extra +1A and +1D.", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_nick_fury", type: 'character', sets: ['avx'], name: 'Nick Fury',
                        cards: [
                            { _id: "avx_card_51",  type: 'card', set: 'avx', "number": 51, "name": "Mr. Anger", "cost": 2, "cost_type": "Shield", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "While Nick Fury is active, you may field Avengers characters for free.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_83",  type: 'card', set: 'avx', "number": 83, "name": "WWII Veteran", "cost": 2, "cost_type": "Shield", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "While Nick Fury is active, your Avengers characters get +1A and +1D.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_115", type: 'card', set: 'avx', "number": 115, "name": "Patch", "cost": 4, "cost_type": "Shield", "affiliation": "", "rarity": "Rare", "die_limit": 2, "starter": "", "ability": "While Nick Fury is active, your unblocked Avengers characters deal damage to your opponent twice.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_nightcrawler", type: 'character', sets: ['avx'], name: 'Nightcrawler',
                        cards: [
                            { _id: "avx_card_52",  type: 'card', set: 'avx', "number": 52, "name": "Fuzzy Elf", "cost": 5, "cost_type": "Fist", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "Nightcrawler cannot be blocked by non-[Mask] characters.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_84",  type: 'card', set: 'avx', "number": 84, "name": "Abandoned", "cost": 4, "cost_type": "Fist", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "At the end of the attack step, knock out one character that blocked Nightcrawler.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_116", type: 'card', set: 'avx', "number": 116, "name": "Circus Freak", "cost": 4, "cost_type": "Fist", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "After assigning blockers, knock out one character blocking Nightcrawler (before assigning damage).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_nova", type: 'character', sets: ['avx'], name: 'Nova',
                        cards: [
                            { _id: "avx_card_53",  type: 'card', set: 'avx', "number": 53, "name": "Quasar", "cost": 5, "cost_type": "Bolt", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "Each time Nova takes damage, you may draw one die and put it in your prep area.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_85",  type: 'card', set: 'avx', "number": 85, "name": "Bucket Head", "cost": 6, "cost_type": "Bolt", "affiliation": "", "rarity": "Uncommon", "die_limit": 3, "starter": "", "ability": "The first time Nova takes damage each turn, you may redirect that damage to one target character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_117", type: 'card', set: 'avx', "number": 117, "name": "The Human Rocket", "cost": 5, "cost_type": "Bolt", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "Whenever Nova takes damage in an attack step, he deals 2 damage to your opponent.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_phoenix", type: 'character', sets: ['avx'], name: 'Phoenix',
                        cards: [
                            { _id: "avx_card_54",  type: 'card', set: 'avx', "number": 54, "name": "Ms. Psyche", "cost": 6, "cost_type": "Bolt", "affiliation": "X-Men", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "When Phoenix is engaged, she gains +2A and +2D.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Bolt].  Target character must attack."},
                            { _id: "avx_card_86",  type: 'card', set: 'avx', "number": 86, "name": "Redd", "cost": 8, "cost_type": "Bolt", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 3, "starter": "", "ability": "When Phoenix is engaged, you may spend [2 Bolt] to deal 4 damage to target character or opponent.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Bolt]. Target character must be assigned to attack if able."},
                            { _id: "avx_card_118", type: 'card', set: 'avx', "number": 118, "name": "Jeannie", "cost": 7, "cost_type": "Bolt", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 3, "starter": "", "ability": "At the end of the attack step, each character that is still engaged with Phoenix deals its damage to your opponent. Knock out those characters.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Bolt]. Target character must attack."}
                        ]

                    },
                    {
                        _id: "character_professor_x", type: 'character', sets: ['avx'], name: 'Professor X',
                        cards: [
                            { _id: "avx_card_55",  type: 'card', set: 'avx', "number": 55, "name": "Principal", "cost": 6, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "While Professor X is active, your opponent cannot reroll dice during the Roll and Reroll Step.  He or she can pay 2 life to prevent this effect for this turn.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_87",  type: 'card', set: 'avx', "number": 87, "name": "Powerful Telepath", "cost": 5, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "While Professor X is active, your opponent cannot use actions or global abilities. He or she can pay 2 life to prevent this effect for the rest of the turn.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_119", type: 'card', set: 'avx', "number": 119, "name": "Charles Francis Xavier", "cost": 6, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "While Professor X is active, your opponent cannot field characters. He or she can pay 2 life to prevent this effect for the rest of the turn.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_punisher", type: 'character', sets: ['avx'], name: 'Punisher',
                        cards: [
                            { _id: "avx_card_56",  type: 'card', set: 'avx', "number": 56, "name": "McRook", "cost": 4, "cost_type": "Bolt", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When Punisher assigns to attack, knock out one target opposing character. Your opponent may prevent this effect by paying 2 life.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_88",  type: 'card', set: 'avx', "number": 88, "name": "Vigilante", "cost": 5, "cost_type": "Bolt", "affiliation": "", "rarity": "Uncommon", "die_limit": 3, "starter": "", "ability": "When Punisher assigns to attack, search your bag for a Punisher die and put it into your prep area. Your opponent can prevent this by paying 3 life.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_120", type: 'card', set: 'avx', "number": 120, "name": "Big Nothing", "cost": 6, "cost_type": "Bolt", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When Punisher assigns to attack, he deals 2 damage to each opposing character.  Your opponent can prevent this effect by paying 4 life.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_rogue", type: 'character', sets: ['avx'], name: 'Rogue',
                        cards: [
                            { _id: "avx_card_57",  type: 'card', set: 'avx', "number": 57, "name": "Anna Raven", "cost": 4, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When fielded, you may capture an opposing die in the used pile (return it at the end of the turn). Spin it to level 1. Rogue copies that die's stats.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_89",  type: 'card', set: 'avx', "number": 89, "name": "Anna Marie", "cost": 5, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "When fielded, capture an opposing action die from the used pile or reserve pool. When Rogue attacks, you may use that action for free (with no bursts). Return it to the used pile after the attack step.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_121", type: 'card', set: 'avx', "number": 121, "name": "Can't Touch This", "cost": 6, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, capture an opposing fielded character (until the end of the turn). Rogue copies that character's stats and abilities.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_silver_surfer", type: 'character', sets: ['avx'], name: 'Silver Surfer',
                        cards: [
                            { _id: "avx_card_58",  type: 'card', set: 'avx', "number": 58, "name": "Silverado", "cost": 6, "cost_type": "Shield", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "At the start of the attack step, if your opponent has more life than you, Silver Surfer gets +2A and +2D.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Once during your turn, pay [1 Shield] and take 2 damage to draw a die and place it in your prep area."},
                            { _id: "avx_card_90",  type: 'card', set: 'avx', "number": 90, "name": "Sentinel", "cost": 6, "cost_type": "Shield", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "While Silver Surfer is active, if your opponent has more life than you, draw one extra die each Clear and Draw Step.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Once during your turn, pay [1 Shield] and take 2 damage to draw a die and place it in your prep area."},
                            { _id: "avx_card_122", type: 'card', set: 'avx', "number": 122, "name": "Sky-Rider", "cost": 7, "cost_type": "Shield", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "At the start of the attack step, if your opponent has more life than you, double Silver Surfer's attack and defense.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Once during your turn, pay [1 Shield] and take 2 damage to draw a die and place it in your prep area."}
                        ]

                    },
                    {
                        _id: "character_spider_man", type: 'character', sets: ['avx', 'op'], name: 'Spider-Man',
                        cards: [
                            { _id: "avx_card_16", type: 'card', set: 'avx', "number": 16, "name": "Tiger", "cost": 4, "cost_type": "Fist", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "You may pay [1 Fist] to prevent Spider-Man from being affected by an ability or game effect (other than damage from a character engaged with him).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_17", type: 'card', set: 'avx', "number": 17, "name": "Webhead", "cost": 4, "cost_type": "Fist", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When Spider-Man assigns to attack,  you may pay [1 Fist] to give him +4D (you can only do this once turn per die).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_18", type: 'card', set: 'avx', "number": 18, "name": "Webslinger", "cost": 5, "cost_type": "Fist", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When Spider-Man assigns to attack, you may pay [1 Fist] to force every opposing character to block him if able.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_91", type: 'card', set: 'avx', "number": 91, "name": "Wall-Crawler", "cost": 4, "cost_type": "Fist", "affiliation": "", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "If Spider-Man attacks and is not blocked, you may pay [2 Fist] to change your opponent's life to 10 (before damage is dealt).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "op_card_8", type: 'card', set: 'op', "number": 8, "name": "The Amazing", "cost": 6, "cost_type": "Fist", "affiliation": "", "rarity": "Common", "die_limit": 2, "starter": "", "ability": "When Spider-Man attacks, you may pay [3 Fist] to make your opponent lose half his life, rounded down (before damage is dealt).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_storm", type: 'character', sets: ['avx'], name: 'Storm',
                        cards: [
                            { _id: "avx_card_19", type: 'card', set: 'avx', "number": 19, "name": "African Priestess", "cost": 3, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When fielded, reroll a target opposing character. If the result is not a character, place that die in your opponent's used pile.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_20", type: 'card', set: 'avx', "number": 20, "name": "Goddess of the Plains", "cost": 4, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When Storm attacks, reroll each of your opponent's characters. Place any die that does not result in a character in your opponent's prep area.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_21", type: 'card', set: 'avx', "number": 21, "name": "'Ro", "cost": 2, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "After blockers are assigned, reroll all characters engaged with Storm. Place each such die that does not show a character in your opponent's prep area.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_92", type: 'card', set: 'avx', "number": 92, "name": "Wind-Rider", "cost": 5, "cost_type": "Mask", "affiliation": "X-Men", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "When fielded, reroll up to 2 opposing characters.  Each die that   does not roll a character goes to your opponent's used pile. Storm deals 2 damage to your opponent for each die moved.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_thing", type: 'character', sets: ['avx'], name: 'Thing',
                        cards: [
                            { _id: "avx_card_59",  type: 'card', set: 'avx', "number": 59, "name": "Ever-Lovin' Blue-Eyed", "cost": 6, "cost_type": "Fist", "affiliation": "Fantastic Four", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "At the start of the attack step, if your opponent has more fielded characters than you, Thing can't be blocked and takes no damage while blocking.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_93",  type: 'card', set: 'avx', "number": 93, "name": "Grim Ben", "cost": 5, "cost_type": "Fist", "affiliation": "Fantastic Four", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "At the start of the attack step, if your opponent has more fielded characters than you, Thing gets +3A and +3D (until the end of the turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_123", type: 'card', set: 'avx', "number": 123, "name": "Idol of Millions", "cost": 7, "cost_type": "Fist", "affiliation": "Fantastic Four", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, if your opponent has more fielded characters than you, draw and roll 3 dice (place them in your reserve pool).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_thor", type: 'character', sets: ['avx', 'op'], name: 'Thor',
                        cards: [
                            { _id: "avx_card_22", type: 'card', set: 'avx', "number": 22, "name": "Legendary Warrior", "cost": 6, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When Thor damages your opponent, knock out an opposing [Fist] character.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_23", type: 'card', set: 'avx', "number": 23, "name": "Lord of Asgard", "cost": 6, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "Thor can't be blocked by [Fist] characters.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_24", type: 'card', set: 'avx', "number": 24, "name": "Odinson", "cost": 6, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "Y", "ability": "When fielded, capture all opposing [Fist] characters (return them at the end of the turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_94", type: 'card', set: 'avx', "number": 94, "name": "God of Thunder", "cost": 6, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Uncommon", "die_limit": 5, "starter": "", "ability": "At the start of each attack step, Thor gets +4A and +4D for each opposing [Fist] character in the field (until the end of the turn).", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "op_card_7", type: 'card', set: 'op', "number": 7, "name": "The Mighty", "cost": 7, "cost_type": "Bolt", "affiliation": "Avengers", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "When fielded, you may knock out an opposing [Fist] character and gain life equal to its level.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    },
                    {
                        _id: "character_venom", type: 'character', sets: ['avx'], name: 'Venom',
                        cards: [
                            { _id: "avx_card_60",  type: 'card', set: 'avx', "number": 60, "name": "Eddie Brock", "cost": 6, "cost_type": "Fist", "affiliation": "Villains", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "Non-[Fist] characters can't block Venom.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Fist] to spin an opponent's [Fist] character down 1 level."},
                            { _id: "avx_card_95",  type: 'card', set: 'avx', "number": 95, "name": "Mac Gargan", "cost": 5, "cost_type": "Fist", "affiliation": "Villains", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "If Venom blocks and knocks out a non-[Fist] character, he deals 2 damage to your opponent and you gain 1 life.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Fist] to spin an opponent's [Fist] character down 1 level."},
                            { _id: "avx_card_124", type: 'card', set: 'avx', "number": 124, "name": "Angelo Fortunato", "cost": 6, "cost_type": "Fist", "affiliation": "Villains", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "While Venom is active, your opponent's non-[Fist] characters get -2A and -2D.", "ability_burst": "Your [Fist] characters get +1A and +1D.", "ability_double_burst": null, "ability_global": "Pay [1 Fist] to spin an opponent's [Fist] character down 1 level."}
                        ]

                    },
                    {
                        _id: "character_vibranium_shield", type: 'character', sets: ['avx'], name: 'Vibranium Shield',
                        cards: [
                            { _id: "avx_card_64",  type: 'card', set: 'avx', "number": 64, "name": "One of a Kind", "cost": 4, "cost_type": "Shield", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "At the start of your attack step, choose an energy type. This turn, characters of that type take no damage.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Shield] to prevent 1 damage to a character or player."},
                            { _id: "avx_card_98",  type: 'card', set: 'avx', "number": 98, "name": "Irreplaceable", "cost": 6, "cost_type": "Shield", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "Place this die touching an opposing character.  Opposing characters that match that character's type cannot attack or block until the end of your opponent's next turn.  Then place this die in the used pile.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Shield] to prevent 1 damage to a character or player."},
                            { _id: "avx_card_128", type: 'card', set: 'avx', "number": 128, "name": "Cap's Protection", "cost": 5, "cost_type": "Shield", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "Place this die touching your target character.  It does not go to your used pile.  You may place this die in the used pile at any time to prevent all damage to the character for the rest of the turn.", "ability_burst": "", "ability_double_burst": null, "ability_global": "Pay [1 Shield] to prevent 1 damage to a character or player."}
                        ]

                    },
                    {
                        _id: "character_war_machine", type: 'character', sets: ['avx'], name: 'War Machine',
                        cards: [
                            { _id: "avx_card_61",  type: 'card', set: 'avx', "number": 61, "name": "Combat Comrade", "cost": 5, "cost_type": "Shield", "affiliation": "", "rarity": "Common", "die_limit": 4, "starter": "", "ability": "War Machine gets +2A and +2D if you have Iron Man in the field.", "ability_burst": "", "ability_double_burst": null, "ability_global": "When one of your [Shield] characters damages your opponent in the attack step, pay [Shield] to gain 1 life."},
                            { _id: "avx_card_96",  type: 'card', set: 'avx', "number": 96, "name": "Parnell Jacobs", "cost": 5, "cost_type": "Shield", "affiliation": "", "rarity": "Uncommon", "die_limit": 4, "starter": "", "ability": "War Machine can't be blocked if you have Iron Man fielded.", "ability_burst": "", "ability_double_burst": null, "ability_global": "When one of your [Shield] characters damages your opponent in the attack step, pay [1 Shield] to gain 1 life."},
                            { _id: "avx_card_125", type: 'card', set: 'avx', "number": 125, "name": "James Rhodes", "cost": 5, "cost_type": "Shield", "affiliation": "", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When fielded, if you have Iron Man fielded, knock out an opponent's character.", "ability_burst": "", "ability_double_burst": null, "ability_global": "When one of your [Shield] characters damages your opponent in the attack step, pay [1 Shield] to gain 1 life."}
                        ]

                    },
                    {
                        _id: "character_wolverine", type: 'character', sets: ['avx'], name: 'Wolverine',
                        cards: [
                            { _id: "avx_card_62",  type: 'card', set: 'avx', "number": 62, "name": "Wildboy", "cost": 5, "cost_type": "Fist", "affiliation": "X-Men", "rarity": "Common", "die_limit": 3, "starter": "", "ability": "When Wolverine attacks alone, you may spin one opponent's character down one level.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_126", type: 'card', set: 'avx', "number": 126, "name": "Formerly Weapon Ten", "cost": 4, "cost_type": "Fist", "affiliation": "X-Men", "rarity": "Rare", "die_limit": 4, "starter": "", "ability": "When Wolverine attacks alone, he gains +4A and +4D.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""},
                            { _id: "avx_card_132", type: 'card', set: 'avx', "number": 132, "name": "Canucklehead", "cost": 6, "cost_type": "Fist", "affiliation": "X-Men", "rarity": "Super-Rare", "die_limit": 3, "starter": "", "ability": "When Wolverine attacks alone, he cannot be blocked.", "ability_burst": "", "ability_double_burst": null, "ability_global": ""}
                        ]

                    }

                ];

                proms = [];

                var queryProm = db.query(
                    function (doc) {
                        if (doc.type === 'basics' || doc.type === 'character' || doc.type === 'set' || doc._id == 'metadata' || doc.type === 'stored_view')
                        {
                            emit(doc._id);
                        }

                    }, { include_docs: true }
                ).then(function (data) {
                    console.log("[DB] Queueing delete promises.");
                    angular.forEach(data.rows, function (row) {
                        proms.push(db.remove(row.doc));
                    });

                });

                proms.push(queryProm);

                $q.all(proms).then(function () {
                    console.log("[DB] All delete promises finished.");

                    db.bulkDocs({ docs: seedData }).then(function (res) {
                        console.log("[DB] Seeding Pouch.");
                        deferred.resolve();
                    }, function (err) {
                        console.log("[DB] ERR: " + err);
                        deferred.reject(err);
                    });

                });

                return deferred.promise;


            }

        };

        return Set;

    })
    .factory('Teams', function($q, Sets, pouchdb) {

        var db = pouchdb.create('setData');

        var Team = {
            all: function () {
                return db.query('team_index', { include_docs: true });
            },
            find: function (id) {
                return db.get(id);
            },
            new: function () {
                return db.post({ name: "New Team", type: 'team', set_cards: {}, dice: {} });
            },
            create: function (team) {
                return db.post(team);
            },
            save: function (team) {

                var deferred = $q.defer();

                var clone = angular.copy(team);

                console.log("[DB] Retrieving existing team document to replace it.");
                db.get(team._id).then(function (doc) {
                    console.log("[DB] Found existing team document.");
                    clone._rev = doc._rev;

                    db.put(clone).then(function (data) {
                        console.log("[DB] Replaced team data with new data");
                        deferred.resolve();
                    }, function (err) {
                        console.log("[DB] ERR: " + err);
                    });
                });

                return deferred.promise;
            },
            remove: function (team) {
                return db.remove(team);
            },
            cardsForTeam: function (team) {
                var deferred = $q.defer();

                Sets.cardsByCharacter().then(function (data) {

                    var matches = [];

                    angular.forEach(data.rows, function (row) {

                        for (var i in row.doc.cards) {
                            var card = row.doc.cards[i];

                            if (team.set_cards[card.type + '-' + card._id]) {
                                matches.push(row);
                                break;
                            }
                        }

                    });

                    deferred.resolve(matches);

                });

                return deferred.promise;

            },
            totalCards: function (cards) {
                var total = 0;

                angular.forEach(cards, function (value) {
                    if (value) {
                        total++;
                    }
                });

                return total;

            },
            totalDice: function (dice) {
                var total = 0;

                angular.forEach(dice, function (value) {
                    if (value) {
                        total++;
                    }
                });

                return total;
            },
            addDie: function (team, card) {

                if (team.dice[card._id]) {
                    if (team.dice[card._id] < card.die_limit) {
                        team.dice[card._id]++;
                    }
                }
                else {
                    team.dice[card._id] = 1;
                }

            },
            removeDie: function (team, card) {

                if (team.dice[card._id] && team.dice[card._id] > 0) {
                    team.dice[card._id]--;
                }
                else {
                    team.dice[card._id] = 0;
                }

            },
            basicCount: function (team) {
                var count = 0;

                if (team) {
                    angular.forEach(team.set_cards, function (card, key) {
                        if (key.split(/-(.+)?/)[0] === 'basic' && card) {
                            count++;
                        }
                    });

                    return count;

                }

            },
            cardCount: function (team) {
                var count = 0;

                if (team) {
                    angular.forEach(team.set_cards, function (card, key) {
                        if (key.split(/-(.+)?/)[0] === 'card' && card) {
                            count++;
                        }
                    });

                    return count;

                }

            },
            diceCount: function (team) {
                var count = 0;

                if (team) {
                    angular.forEach(team.set_cards, function (card, key) {
                        if ((key.split(/-(.+)?/)[0] === 'card' || key.split(/-(.+)?/)[0] === 'basic') && card) {
                            var dice = team.dice[key.split(/-(.+)?/)[1]];

                            if (dice) {
                                count += dice;
                            }

                        }
                    });

                    return count;

                }

            }
        };

        return Team;

    });