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
//            $('#start').css('margin-top', '100px');
        };
    })
    .controller('ExamController', function($rootScope, $scope, $http, $timeout) {
        $scope.loading = true;
        $scope.minutes = 0;
        $scope.seconds = 0;

        $scope.allQuestions = [];
        $scope.questions = [];
        $scope.numQuestions = 0;
        $scope.maxNumOptions = 0;
        $scope.numWrongAnswers = 0;
        $scope.numRightAnswers = 0;

        $scope.currentQuestionIndex = 0;
        $scope.NUM_QUESTIONS = 30;

        $scope.timer = null;
        $scope.timePercent = '0%';
        $scope.MAX_TIME = 20 * 60;   // 20 minutes

        $scope.done = false;

        $scope.init = function() {
            var height = $(document).height() - 100;
            $('#loading').css('margin-top', parseInt(height / 2));

            $http.get('data/questions.json').success(function(response) {
                $scope.allQuestions = response.questions;
                $scope.generateQuestions();
                $scope.loading   = false;
            });

            $scope.enableShortcut();
        };

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
                        if ($scope.currentQuestionIndex < $scope.NUM_QUESTIONS - 1) {
                            $scope.currentQuestionIndex++;
                            $scope.$apply();
                        }
                        break;
                    case 40:    // Bottom arrow
                        if ($scope.currentQuestionIndex < $scope.NUM_QUESTIONS - 3) {
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
                        if (question['option_' + optionIndex] == null) {
                            question['option_' + optionIndex] = true;
                        } else {
                            question['option_' + optionIndex] = !question['option_' + optionIndex];
                        }
                        break;
                    default:
                        break;
                }
            });
        };

        $scope.gotoQuestion = function(index) {
            $scope.currentQuestionIndex = index;
        };

        /**
         * Generate random questions
         */
        $scope.generateQuestions = function() {
            $scope.questions = $scope.allQuestions;
            $scope.numQuestions = $scope.questions.length;
            var maxNumOptions = 0;
            for (var i = 0; i < $scope.numQuestions; i++) {
                maxNumOptions = Math.max(maxNumOptions, $scope.questions[i].options.length);
            }

            $scope.maxNumOptions = new Array(maxNumOptions);

            // Start timer
            $scope.createTimer();
        };

        $scope.createTimer = function() {
            $scope.timer = $timeout(function() {
                $scope.seconds++;
                if ($scope.seconds == 60) {
                    $scope.minutes++;
                    $scope.seconds = 0;
                }
                $scope.timePercent = (60 * $scope.minutes + $scope.seconds) * 100 / $scope.MAX_TIME + '%';
                $scope.createTimer();
            }, 1000);
        };

        $scope.chooseAnswer = function($e, questionIndex, optionIndex) {
            $scope.gotoQuestion(questionIndex);
            $scope.questions[questionIndex]['option_' + optionIndex] = $e.target.checked;
        };

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
            // Clear the timer
            $timeout.cancel($scope.timer);
            $scope.timer = null;

            $http.get('data/answers.json').success(function(response) {
                $scope.done = true;

            });
        };
    });