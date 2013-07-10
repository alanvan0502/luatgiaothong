angular.module('App', [])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('', {
            templateUrl: 'app/views/index.html',
            controller: 'IndexController'
        });
        $routeProvider.when('/exam', {
            templateUrl: 'app/views/exam.html',
            controller: 'ExamController'
        });
    }])
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
    .controller('ExamController', function($rootScope, $scope, $http, $timeout) {
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

            var height = $(document).height() - 100;
            $('#loading').css('margin-top', parseInt(height / 2));

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