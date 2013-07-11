/**
 * @author      Nguyen Huu Phuoc <phuoc@huuphuoc.me>
 * @copyright   (c) 2013 Nguyen Huu Phuoc
 */

angular.module('App', [ 'LocalStorageModule' ])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('', {
            templateUrl: 'app/views/index.html',
            controller: 'IndexController'
        });
        $routeProvider.when('/exam', {
            templateUrl: 'app/views/exam.html',
            controller: 'ExamController'
        });
        $routeProvider.when('/history', {
            templateUrl: 'app/views/history.html',
            controller: 'HistoryController'
        });
        $routeProvider.when('/contact', {
            templateUrl: 'app/views/contact.html',
            controller: 'HistoryController'
        });
    }])
    .config(function($httpProvider) {
        var numLoadings = 0;
        var loadingScreen = $('<div style="position: fixed; top: 0; left: 0; z-index: 1000; width: 100%; height: 100%;"><div class="container" style="position: absolute; top: 50%; left: 0; width: 100%;"><div class="container"><div class="span6 offset3"><div class="progress progress-striped active"><div class="bar" style="width: 100%;"></div></div></div></div></div></div>').appendTo($('body')).hide();
        $httpProvider.responseInterceptors.push(function() {
            return function(promise) {
                numLoadings++;
                loadingScreen.show();
                var hide = function(r) {
                    if (!(--numLoadings)) {
                        loadingScreen.hide();
                    }
                    return r;
                };
                return promise.then(hide, hide);
            };
        });
    })
    .filter('i18n', function(){
        var language = 'vi_VN';
        return function(text){
            if (window.lang[language] === void(0)) {
                return text;
            }
            if (window.lang[language][text] === void(0)) {
                return text;
            }
            return window.lang[language][text];
        };
    })
//    .config(['$locationProvider', function($locationProvider) {
//        $locationProvider.html5Mode(false);
//    }])
    .controller('IndexController', function($rootScope, $scope) {
        $scope.init = function() {
        };
    })
    .controller('HistoryController', function($rootScope, $scope, localStorageService) {
        $scope.MAX_RECENT_POINTS = 10;
        // The number of right questions required to pass
        $scope.MIN_TO_PASS       = 26;
        $scope.points = [];

        /**
         * Initialize the controller
         */
        $scope.init = function() {
            var points    = localStorageService.get('points');
            points        = (points == null) ? [] : angular.fromJson(points);
            $scope.points = points.length > $scope.MAX_RECENT_POINTS ? points.slice(points.length - $scope.MAX_RECENT_POINTS) : points;
            $scope.points = $scope.points.reverse();
        };

        /**
         * Reset button click handler
         */
        $scope.reset = function() {
            localStorageService.remove('points');
            $scope.points = [];
        };

        $scope.formatDate = function(time) {
            var d = new Date();
            d.setTime(time);
            return [ d.getDate(), d.getMonth(), d.getFullYear() ].join('/') + ' ' + [ d.getHours(), d.getMinutes(), d.getSeconds() ].join(':');
        };
    })
    .controller('ExamController', function($rootScope, $scope, $http, $timeout, localStorageService) {
        $scope.NUM_QUESTIONS = 30;
        $scope.QUESTION_RANGES = [
//            { range: '1..255', total: 9 },
//            { range: '256..450', total: 9 }
            { range: '1..4', total: 2 },
            { range: '5..9', total: 3 },
            { range: '10..15', total: 3 }
        ];

        $scope.MAX_TIME = 20 * 60;   // 20 minutes

        // --- PUBLIC METHODS ---

        /**
         * Reset variables.
         * Should be called when initializing the controller
         */
        $scope.reset = function() {
            $scope.loading = true;
            $scope.done    = false;

            $scope.allQuestions         = [];
            $scope.questions            = [];
            $scope.currentQuestionIndex = 0;

            $scope.numQuestions    = 1;
            $scope.numAnswers      = 0;
            $scope.numWrongAnswers = 0;
            $scope.numRightAnswers = 0;

            $scope.timer   = null;
            $scope.minutes = 0;
            $scope.seconds = 0;
        };

        /**
         * Initialize the controller
         */
        $scope.init = function() {
            $scope.reset();

            $http.get('data/questions.json').success(function(response) {
                $scope.allQuestions = response.questions;
                $scope.generateQuestions();
                $scope.loading = false;
                $scope.enableShortcut();
            });
        };

        /**
         * Jump to the given question
         * @param {int} index
         */
        $scope.gotoQuestion = function(index) {
            $scope.currentQuestionIndex = index;
        };

        /**
         * Choose given option from question
         * @param {int} questionIndex
         * @param {int} optionIndex
         * @param {boolean} chosen
         */
        $scope.chooseAnswer = function(questionIndex, optionIndex, chosen) {
            $scope.gotoQuestion(questionIndex);
            $scope.questions[questionIndex]['__options'][optionIndex] = chosen;

            // I have to set the option index to 1-based index to match it with the correct one later
            optionIndex++;

            if (chosen) {
                if ($scope.questions[questionIndex]['answers'].length == 0) {
                    $scope.questions[questionIndex]['answers'] = [ optionIndex ];
                    $scope.numAnswers++;
                }
                if ($scope.questions[questionIndex]['answers'].indexOf(optionIndex) == -1) {
                    $scope.questions[questionIndex]['answers'].push(optionIndex);
                }
            } else {
                var answer = $scope.questions[questionIndex]['answers'],
                    pos    = answer.indexOf(optionIndex);
                answer.splice(pos, 1);
                if (answer.length == 0) {
                    $scope.numAnswers--;
                }
            }
        };

        /**
         * Format the passed time
         * @returns {string}
         */
        $scope.formatTime = function() {
            var format = function(input) {
                return ((input + '').length > 1) ? ('' + input) : ('0' + input);
            }
            return format($scope.minutes) + ':' + format($scope.seconds);
        };

        /**
         * Finish button click handler
         */
        $scope.finish = function() {
            $scope.removeTimer();

            $http.get('data/answers.json').success(function(response) {
                // Calculate the number of wrong/right answers
                $scope.numRightAnswers = 0;

                var i, j;
                for (i = 0; i < $scope.numQuestions; i++) {
                    j = i + 1;
                    $scope.questions[i]['correct_answers'] = response.answers['' + j];

                    if ($scope.questions[i]['answers'].sort().join('_') == response.answers['' + j].sort().join('_')) {
                        $scope.questions[i]['correct'] = true;
                        $scope.numRightAnswers++;
                    } else {
                        $scope.questions[i]['correct'] = false;
                    }
                }

                $scope.numWrongAnswers = $scope.numQuestions - $scope.numRightAnswers;

                // Store the result
                var points = localStorageService.get('points');
                points = (points == null) ? [] : angular.fromJson(points);
                points.push({
                    'date': new Date().getTime(),
                    'wrong': $scope.numWrongAnswers,
                    'right': $scope.numRightAnswers,
                    'total_time': $scope.formatTime()
                });
                localStorageService.add('points', angular.toJson(points));

                // Done
                $scope.done = true;
            });
        };

        /**
         * Restart button click handler
         */
        $scope.restart = function() {
            $scope.removeTimer();
            $scope.init();
        };

        // --- PRIVATE METHODS ---

        /**
         * Enable short keys
         */
        $scope.enableShortcut = function() {
            $(document).on('keyup', function(e) {
                switch (e.keyCode) {
                    case 37:    // Left arrow
                        if ($scope.currentQuestionIndex > 0) {
                            $scope.currentQuestionIndex--;
                            $scope.$apply();
                        }
                        break;
                        break;
                    case 38:    // Top arrow
                        if ($scope.currentQuestionIndex - 2 >= 0) {
                            $scope.currentQuestionIndex = $scope.currentQuestionIndex - 2;
                            $scope.$apply();
                        }
                        break;
                    case 39:    // Right arrow
                        if ($scope.currentQuestionIndex < $scope.numQuestions - 1) {
                            $scope.currentQuestionIndex++;
                            $scope.$apply();
                        }
                        break;
                    case 40:    // Bottom arrow
                        if ($scope.currentQuestionIndex < $scope.numQuestions - 2) {
                            $scope.currentQuestionIndex = $scope.currentQuestionIndex + 2;
                            $scope.$apply();
                        }
                        break;

                    case 49:    // 1
                    case 50:    // 2
                    case 51:    // 3
                    case 52:    // 4
                    case 53:    // 5
                    case 54:    // 6
                    case 55:    // 7
                    case 56:    // 8
                    case 57:    // 9
                        var optionIndex = e.keyCode - 49, question = $scope.questions[$scope.currentQuestionIndex];
                        if (optionIndex >= question['options'].length) {
                            return;
                        }

                        var chosen = question['answers'].indexOf(optionIndex + 1) == -1;
                        $scope.chooseAnswer($scope.currentQuestionIndex, optionIndex, chosen);
                        break;
                    default:
                        break;
                }
            });
        };

        $scope.createTimer = function() {
            $scope.timer = $timeout(function() {
                $scope.seconds++;
                if ($scope.seconds == 60) {
                    $scope.minutes++;
                    $scope.seconds = 0;
                }
                $scope.createTimer();
            }, 1000);
        };

        $scope.removeTimer = function() {
            $timeout.cancel($scope.timer);
            $scope.timer = null;
        };

        /**
         * Generate random questions
         */
        $scope.generateQuestions = function() {
            var questions = [], i, j, from, to, total, array;
            for (i in $scope.QUESTION_RANGES) {
                from  = $scope.QUESTION_RANGES[i].range.split('..')[0];
                to    = $scope.QUESTION_RANGES[i].range.split('..')[1];
                total = $scope.QUESTION_RANGES[i].total;

                array = $scope.allQuestions.slice(from, to);
                array = $scope.shuffleArray(array);
                array = array.slice(0, total);

                questions = questions.concat(array);
            }

            $scope.numQuestions = questions.length;
            $scope.questions    = [];
            for (i = 0; i < $scope.numQuestions; i++) {
                // The data structure of $scope.questions
                $scope.questions[i] = {
                    'title':   questions[i].title,
                    'content': questions[i].content,
                    'options': questions[i].options,
                    '__options': {},
                    'answers': [],
                    'correct': false
                };
                var numOptions = questions[i].options.length;
                for (j = 0; j < numOptions; j++) {
                    $scope.questions[i]['__options'][j] = false;
                }
            }

            // Start timer
            $scope.createTimer();
        };

        /**
         * Shuffle an array
         * @param {Array} input
         * @return {Array}
         */
        $scope.shuffleArray = function(array) {
            var tmp, current, top = array.length;
            if (top) {
                while(--top) {
                    current        = Math.floor(Math.random() * (top + 1));
                    tmp            = array[current];
                    array[current] = array[top];
                    array[top]     = tmp;
                }
            }
            return array;
        };
    });