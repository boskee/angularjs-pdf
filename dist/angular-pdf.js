/*!
 * Angular-PDF: An Angularjs directive <ng-pdf> to display PDF in the browser with PDFJS.
 * @version 2.0.0
 * @link https://github.com/sayanee/angular-pdf#readme
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("angular"));
	else if(typeof define === 'function' && define.amd)
		define("pdf", ["angular"], factory);
	else if(typeof exports === 'object')
		exports["pdf"] = factory(require("angular"));
	else
		root["pdf"] = factory(root["angular"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_0__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "http://localhost:8080/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/angular-pdf.module.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/angular-pdf.directive.js":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
const NgPdf = ['$window', '$document', '$log', ($window, $document, $log) => {
  'ngInject';

  const backingScale = canvas => {
    const ctx = canvas.getContext('2d');
    const dpr = $window.devicePixelRatio || 1;
    const bsr = ctx.webkitBackingStorePixelRatio ||
      ctx.mozBackingStorePixelRatio ||
      ctx.msBackingStorePixelRatio ||
      ctx.oBackingStorePixelRatio ||
      ctx.backingStorePixelRatio || 1;

    return dpr / bsr;
  };

  const setCanvasDimensions = (canvas, w, h) => {
    const ratio = backingScale(canvas);
    canvas.width = Math.floor(w * ratio);
    canvas.height = Math.floor(h * ratio);
    canvas.style.width = `${Math.floor(w)}px`;
    canvas.style.height = `${Math.floor(h)}px`;
    canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
    return canvas;
  };

  const initCanvas = (element, canvas) => {
    angular.element(canvas).addClass('rotate0');
    element.append(canvas);
  };

  const onPassword = function (password, incorrectPasswordCallback) {
    return function (updatePasswordFn, passwordResponse) {
      switch (passwordResponse) {
        case PDFJS.PasswordResponses.NEED_PASSWORD:
          updatePasswordFn(password);
          break;
        case PDFJS.PasswordResponses.INCORRECT_PASSWORD:
          incorrectPasswordCallback();
          break;
      }
    };
  };

  return {
    restrict: 'E',
    scope: {
      pdf: '=',
      onError: '&',
      onProgress: '&',
      onSuccess: '&',
      onIncorrectPassword: '&'
    },
    link(scope, element, attrs) {
      let renderTask = null;
      let pdfLoaderTask = null;
      let debug = false;
      let httpHeaders = scope.pdf.httpHeaders;
      let limitHeight = attrs.limitcanvasheight === '1';
      let pdfDoc = null;
      let pageToDisplay = scope.pdf.currentPage;
      debug = attrs.hasOwnProperty('debug') ? attrs.debug : false;

      let windowEl = angular.element($window);

      element.css('display', 'block');

      windowEl.on('scroll', () => {
        scope.$apply(() => {
          scope.scroll = windowEl[0].scrollY;
        });
      });

      PDFJS.disableWorker = true;

      renderPDF()
      scope.$watch(() => scope.pdf, (newVal, oldVal) => {
        if (newVal !== oldVal) {
          renderPDF();
        }
      });

      const renderPage = num => {
        if (pdfDoc === null) {
          console.warn("pdfDoc is null")
          return;
        }
        if (renderTask) {
          renderTask._internalRenderTask.cancel();
        }

        pdfDoc.getPage(num).then(page => {
          let viewport;
          let pageWidthScale;
          let renderContext;
          let canvas = $document[0].createElement('canvas');
          initCanvas(element, canvas);
          let ctx = canvas.getContext('2d');

          if (scope.pdf.fitToPage) {
            viewport = page.getViewport(1);
            const clientRect = element[0].getBoundingClientRect();
            pageWidthScale = clientRect.width / viewport.width;
            if (limitHeight) {
              pageWidthScale = Math.min(pageWidthScale, clientRect.height / viewport.height);
            }
            scope.pdf.scale = pageWidthScale;
          }
          viewport = page.getViewport(scope.pdf.scale);

          setCanvasDimensions(canvas, viewport.width, viewport.height);

          renderContext = {
            canvasContext: ctx,
            viewport
          };

          renderTask = page.render(renderContext);
          renderTask.promise.then(() => {
            if (angular.isFunction(scope.onPageRender)) {
              scope.onPageRender();
            }
          }).catch(reason => {
            $log.log(reason);
          });
        });
      };

      function clearCanvas() {
        element.find('canvas').remove();
      }

      function renderPDF() {

        let params = {
          'url': scope.pdf.url,
          'withCredentials': scope.pdf.useCredentials
        };

        // if (httpHeaders) {
        //   params.httpHeaders = httpHeaders;
        // }

        if (scope.pdf.url && scope.pdf.url.length) {
          PDFJS.disableWorker = true;
          pdfLoaderTask = PDFJS.getDocument(params);
          pdfLoaderTask.onProgress = scope.onProgress;
          pdfLoaderTask.onPassword = onPassword(scope.pdf.password, scope.onIncorrectPassword);
          pdfLoaderTask.then(
            _pdfDoc => {
              run_success_hook()

              pdfDoc = _pdfDoc;

              clearCanvas();

              for (var num = 1; num <= _pdfDoc.numPages; num++) {
                  renderPage(num);           
              }

              scope.$apply(() => {
                scope.pdf.pageCount = _pdfDoc.numPages;
              });
            }, error => {
              run_error_hook(error)
            }
          );
        }
      }

      scope.$watch(() => { return scope.pdf.scale }, (newVal, oldVal) => {
        if (newVal !== oldVal) {
          renderPDF();          
        }
      });

      scope.$watch(() => { return scope.pdf.fitToPage }, (newVal, oldVal) => {
        if (newVal !== oldVal && newVal === true) {
          renderPDF();
        }
      });

      const run_success_hook = () => {
        if (angular.isFunction(scope.onSuccess)) {
          scope.onSuccess();
        }
      };

      const run_error_hook = (error) => {
        if (angular.isFunction(scope.onError)) {
          scope.onError(error);
        }
      };
    }
  }
}]
/* harmony export (immutable) */ __webpack_exports__["a"] = NgPdf;



/***/ }),

/***/ "./src/angular-pdf.factory.js":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
const NgPdfFactory = function () {
  'ngInject';

  const defaultOptions = {
    currentPage: 1,
    fitToPage: false,
    httpHeaders: null,
    scale: 1,
    useCredentials: false,
    password: null,
    rotation: 0,
    pageCount: null,
  };

  return function (url, opts) {
    let self = this

    let options = Object.assign({}, defaultOptions, opts)

    Object.defineProperty(this, 'url', {
      enumerable: true,
      writable: false,
      value: url
    });

    // defined all properties in defaultOptions and opts as property of this object
    Object.keys(options).forEach((e) => {
      Object.defineProperty(self, e, {
        enumerable: true,
        set: (value) => { options[e] = value },
        get: () => { return options[e] }
      });
    })

    this.goPrevious = () => {
      if (options.currentPage <= 1) {
        return false;
      }
      options.currentPage -= 1;
    };

    this.goNext = () => {
      if (options.currentPage >= options.pageCount) {
        return false;
      }
      options.currentPage += 1;
    };

    this.zoomIn = () => {
      options.fitToPage = false;
      options.scale = parseFloat(options.scale) + 0.2
    };

    this.zoomOut = () => {
      options.fitToPage = false;
      options.scale = parseFloat(options.scale) - 0.2
    };

    this.fit = () => {
      options.fitToPage = true;
    }

    this.rotateLeft = () => {
      options.rotation = ((options.rotation === 0 ? 360 : options.rotation) - 90);
    };

    this.rotateRight = () => {
      options.rotation = (options.rotation + 90) % 360;
    };

    this.goToPage = (pageNum) => {
      pageNum = parseInt(pageNum);
      if (pageNum !== NaN && pageNum > 0 && pageNum < options.pageCount) {
        options.currentPage = pageNum;
      } else {
        return false;
      }
    };
  };
}
/* harmony export (immutable) */ __webpack_exports__["a"] = NgPdfFactory;



/***/ }),

/***/ "./src/angular-pdf.module.js":
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_angular__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_angular___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_angular__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_pdf_directive__ = __webpack_require__("./src/angular-pdf.directive.js");
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__angular_pdf_factory__ = __webpack_require__("./src/angular-pdf.factory.js");




const Pdf = __WEBPACK_IMPORTED_MODULE_0_angular___default.a
  .module('pdf', [])
  .directive('ngPdf', __WEBPACK_IMPORTED_MODULE_1__angular_pdf_directive__["a" /* NgPdf */])
  .factory('NgPdfFactory', __WEBPACK_IMPORTED_MODULE_2__angular_pdf_factory__["a" /* NgPdfFactory */])
  .name;
/* harmony export (immutable) */ __webpack_exports__["Pdf"] = Pdf;


/* harmony default export */ __webpack_exports__["default"] = (Pdf);


/***/ }),

/***/ 0:
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_0__;

/***/ })

/******/ });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovLy93ZWJwYWNrL2Jvb3RzdHJhcCA5NzUzMGNhNjM5ZjI4NzEyZmY4MiIsIndlYnBhY2s6Ly8vLi9zcmMvYW5ndWxhci1wZGYuZGlyZWN0aXZlLmpzIiwid2VicGFjazovLy8uL3NyYy9hbmd1bGFyLXBkZi5mYWN0b3J5LmpzIiwid2VicGFjazovLy8uL3NyYy9hbmd1bGFyLXBkZi5tb2R1bGUuanMiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwiYW5ndWxhclwiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7QUFDRCxPO0FDVkE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLG1EQUEyQyxjQUFjOztBQUV6RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQUs7QUFDTDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1DQUEyQiwwQkFBMEIsRUFBRTtBQUN2RCx5Q0FBaUMsZUFBZTtBQUNoRDtBQUNBO0FBQ0E7O0FBRUE7QUFDQSw4REFBc0QsK0RBQStEOztBQUVySDtBQUNBOztBQUVBO0FBQ0E7Ozs7Ozs7OztBQ2hFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixjQUFjO0FBQzFDLDZCQUE2QixjQUFjO0FBQzNDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNULE9BQU87O0FBRVA7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87O0FBRVA7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYO0FBQ0EsV0FBVztBQUNYLFNBQVM7QUFDVDs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUEsK0JBQStCLHlCQUF5QjtBQUN4RCxrQztBQUNBOztBQUVBO0FBQ0E7QUFDQSxlQUFlO0FBQ2YsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsMEJBQTBCLHlCQUF5QjtBQUNuRDtBQUNBLHNCO0FBQ0E7QUFDQSxPQUFPOztBQUVQLDBCQUEwQiw2QkFBNkI7QUFDdkQ7QUFDQTtBQUNBO0FBQ0EsT0FBTzs7QUFFUDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUFBO0FBQUE7Ozs7Ozs7OztBQ2xNRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsa0NBQWtDOztBQUVsQztBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUIscUJBQXFCO0FBQzlDLG9CQUFvQjtBQUNwQixPQUFPO0FBQ1AsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUFBOzs7Ozs7Ozs7Ozs7OztBQy9FQTtBQUNnQjtBQUNPOztBQUV2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFBQTs7QUFFQTs7Ozs7Ozs7QUNWQSwrQyIsImZpbGUiOiJhbmd1bGFyLXBkZi5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcImFuZ3VsYXJcIikpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoXCJwZGZcIiwgW1wiYW5ndWxhclwiXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJwZGZcIl0gPSBmYWN0b3J5KHJlcXVpcmUoXCJhbmd1bGFyXCIpKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJwZGZcIl0gPSBmYWN0b3J5KHJvb3RbXCJhbmd1bGFyXCJdKTtcbn0pKHRoaXMsIGZ1bmN0aW9uKF9fV0VCUEFDS19FWFRFUk5BTF9NT0RVTEVfMF9fKSB7XG5yZXR1cm4gXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svdW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbiIsIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGlkZW50aXR5IGZ1bmN0aW9uIGZvciBjYWxsaW5nIGhhcm1vbnkgaW1wb3J0cyB3aXRoIHRoZSBjb3JyZWN0IGNvbnRleHRcbiBcdF9fd2VicGFja19yZXF1aXJlX18uaSA9IGZ1bmN0aW9uKHZhbHVlKSB7IHJldHVybiB2YWx1ZTsgfTtcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7XG4gXHRcdFx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxuIFx0XHRcdFx0ZW51bWVyYWJsZTogdHJ1ZSxcbiBcdFx0XHRcdGdldDogZ2V0dGVyXG4gXHRcdFx0fSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiaHR0cDovL2xvY2FsaG9zdDo4MDgwL1wiO1xuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9zcmMvYW5ndWxhci1wZGYubW9kdWxlLmpzXCIpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIHdlYnBhY2svYm9vdHN0cmFwIDk3NTMwY2E2MzlmMjg3MTJmZjgyIiwiZXhwb3J0IGNvbnN0IE5nUGRmID0gWyckd2luZG93JywgJyRkb2N1bWVudCcsICckbG9nJywgKCR3aW5kb3csICRkb2N1bWVudCwgJGxvZykgPT4ge1xuICAnbmdJbmplY3QnO1xuXG4gIGNvbnN0IGJhY2tpbmdTY2FsZSA9IGNhbnZhcyA9PiB7XG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY29uc3QgZHByID0gJHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDE7XG4gICAgY29uc3QgYnNyID0gY3R4LndlYmtpdEJhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHxcbiAgICAgIGN0eC5tb3pCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICBjdHgubXNCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICBjdHgub0JhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHxcbiAgICAgIGN0eC5iYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8IDE7XG5cbiAgICByZXR1cm4gZHByIC8gYnNyO1xuICB9O1xuXG4gIGNvbnN0IHNldENhbnZhc0RpbWVuc2lvbnMgPSAoY2FudmFzLCB3LCBoKSA9PiB7XG4gICAgY29uc3QgcmF0aW8gPSBiYWNraW5nU2NhbGUoY2FudmFzKTtcbiAgICBjYW52YXMud2lkdGggPSBNYXRoLmZsb29yKHcgKiByYXRpbyk7XG4gICAgY2FudmFzLmhlaWdodCA9IE1hdGguZmxvb3IoaCAqIHJhdGlvKTtcbiAgICBjYW52YXMuc3R5bGUud2lkdGggPSBgJHtNYXRoLmZsb29yKHcpfXB4YDtcbiAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYCR7TWF0aC5mbG9vcihoKX1weGA7XG4gICAgY2FudmFzLmdldENvbnRleHQoJzJkJykuc2V0VHJhbnNmb3JtKHJhdGlvLCAwLCAwLCByYXRpbywgMCwgMCk7XG4gICAgcmV0dXJuIGNhbnZhcztcbiAgfTtcblxuICBjb25zdCBpbml0Q2FudmFzID0gKGVsZW1lbnQsIGNhbnZhcykgPT4ge1xuICAgIGFuZ3VsYXIuZWxlbWVudChjYW52YXMpLmFkZENsYXNzKCdyb3RhdGUwJyk7XG4gICAgZWxlbWVudC5hcHBlbmQoY2FudmFzKTtcbiAgfTtcblxuICBjb25zdCBvblBhc3N3b3JkID0gZnVuY3Rpb24gKHBhc3N3b3JkLCBpbmNvcnJlY3RQYXNzd29yZENhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh1cGRhdGVQYXNzd29yZEZuLCBwYXNzd29yZFJlc3BvbnNlKSB7XG4gICAgICBzd2l0Y2ggKHBhc3N3b3JkUmVzcG9uc2UpIHtcbiAgICAgICAgY2FzZSBQREZKUy5QYXNzd29yZFJlc3BvbnNlcy5ORUVEX1BBU1NXT1JEOlxuICAgICAgICAgIHVwZGF0ZVBhc3N3b3JkRm4ocGFzc3dvcmQpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFBERkpTLlBhc3N3b3JkUmVzcG9uc2VzLklOQ09SUkVDVF9QQVNTV09SRDpcbiAgICAgICAgICBpbmNvcnJlY3RQYXNzd29yZENhbGxiYWNrKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRScsXG4gICAgc2NvcGU6IHtcbiAgICAgIHBkZjogJz0nLFxuICAgICAgb25FcnJvcjogJyYnLFxuICAgICAgb25Qcm9ncmVzczogJyYnLFxuICAgICAgb25TdWNjZXNzOiAnJicsXG4gICAgICBvbkluY29ycmVjdFBhc3N3b3JkOiAnJidcbiAgICB9LFxuICAgIGxpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICBsZXQgcmVuZGVyVGFzayA9IG51bGw7XG4gICAgICBsZXQgcGRmTG9hZGVyVGFzayA9IG51bGw7XG4gICAgICBsZXQgZGVidWcgPSBmYWxzZTtcbiAgICAgIGxldCBodHRwSGVhZGVycyA9IHNjb3BlLnBkZi5odHRwSGVhZGVycztcbiAgICAgIGxldCBsaW1pdEhlaWdodCA9IGF0dHJzLmxpbWl0Y2FudmFzaGVpZ2h0ID09PSAnMSc7XG4gICAgICBsZXQgcGRmRG9jID0gbnVsbDtcbiAgICAgIGxldCBwYWdlVG9EaXNwbGF5ID0gc2NvcGUucGRmLmN1cnJlbnRQYWdlO1xuICAgICAgZGVidWcgPSBhdHRycy5oYXNPd25Qcm9wZXJ0eSgnZGVidWcnKSA/IGF0dHJzLmRlYnVnIDogZmFsc2U7XG5cbiAgICAgIGxldCB3aW5kb3dFbCA9IGFuZ3VsYXIuZWxlbWVudCgkd2luZG93KTtcblxuICAgICAgZWxlbWVudC5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcblxuICAgICAgd2luZG93RWwub24oJ3Njcm9sbCcsICgpID0+IHtcbiAgICAgICAgc2NvcGUuJGFwcGx5KCgpID0+IHtcbiAgICAgICAgICBzY29wZS5zY3JvbGwgPSB3aW5kb3dFbFswXS5zY3JvbGxZO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBQREZKUy5kaXNhYmxlV29ya2VyID0gdHJ1ZTtcblxuICAgICAgcmVuZGVyUERGKClcbiAgICAgIHNjb3BlLiR3YXRjaCgoKSA9PiBzY29wZS5wZGYsIChuZXdWYWwsIG9sZFZhbCkgPT4ge1xuICAgICAgICBpZiAobmV3VmFsICE9PSBvbGRWYWwpIHtcbiAgICAgICAgICByZW5kZXJQREYoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlbmRlclBhZ2UgPSBudW0gPT4ge1xuICAgICAgICBpZiAocGRmRG9jID09PSBudWxsKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwicGRmRG9jIGlzIG51bGxcIilcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbmRlclRhc2spIHtcbiAgICAgICAgICByZW5kZXJUYXNrLl9pbnRlcm5hbFJlbmRlclRhc2suY2FuY2VsKCk7XG4gICAgICAgIH1cblxuICAgICAgICBwZGZEb2MuZ2V0UGFnZShudW0pLnRoZW4ocGFnZSA9PiB7XG4gICAgICAgICAgbGV0IHZpZXdwb3J0O1xuICAgICAgICAgIGxldCBwYWdlV2lkdGhTY2FsZTtcbiAgICAgICAgICBsZXQgcmVuZGVyQ29udGV4dDtcbiAgICAgICAgICBsZXQgY2FudmFzID0gJGRvY3VtZW50WzBdLmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICAgIGluaXRDYW52YXMoZWxlbWVudCwgY2FudmFzKTtcbiAgICAgICAgICBsZXQgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgICBpZiAoc2NvcGUucGRmLmZpdFRvUGFnZSkge1xuICAgICAgICAgICAgdmlld3BvcnQgPSBwYWdlLmdldFZpZXdwb3J0KDEpO1xuICAgICAgICAgICAgY29uc3QgY2xpZW50UmVjdCA9IGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBwYWdlV2lkdGhTY2FsZSA9IGNsaWVudFJlY3Qud2lkdGggLyB2aWV3cG9ydC53aWR0aDtcbiAgICAgICAgICAgIGlmIChsaW1pdEhlaWdodCkge1xuICAgICAgICAgICAgICBwYWdlV2lkdGhTY2FsZSA9IE1hdGgubWluKHBhZ2VXaWR0aFNjYWxlLCBjbGllbnRSZWN0LmhlaWdodCAvIHZpZXdwb3J0LmhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzY29wZS5wZGYuc2NhbGUgPSBwYWdlV2lkdGhTY2FsZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmlld3BvcnQgPSBwYWdlLmdldFZpZXdwb3J0KHNjb3BlLnBkZi5zY2FsZSk7XG5cbiAgICAgICAgICBzZXRDYW52YXNEaW1lbnNpb25zKGNhbnZhcywgdmlld3BvcnQud2lkdGgsIHZpZXdwb3J0LmhlaWdodCk7XG5cbiAgICAgICAgICByZW5kZXJDb250ZXh0ID0ge1xuICAgICAgICAgICAgY2FudmFzQ29udGV4dDogY3R4LFxuICAgICAgICAgICAgdmlld3BvcnRcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVuZGVyVGFzayA9IHBhZ2UucmVuZGVyKHJlbmRlckNvbnRleHQpO1xuICAgICAgICAgIHJlbmRlclRhc2sucHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzRnVuY3Rpb24oc2NvcGUub25QYWdlUmVuZGVyKSkge1xuICAgICAgICAgICAgICBzY29wZS5vblBhZ2VSZW5kZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KS5jYXRjaChyZWFzb24gPT4ge1xuICAgICAgICAgICAgJGxvZy5sb2cocmVhc29uKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBmdW5jdGlvbiBjbGVhckNhbnZhcygpIHtcbiAgICAgICAgZWxlbWVudC5maW5kKCdjYW52YXMnKS5yZW1vdmUoKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVuZGVyUERGKCkge1xuXG4gICAgICAgIGxldCBwYXJhbXMgPSB7XG4gICAgICAgICAgJ3VybCc6IHNjb3BlLnBkZi51cmwsXG4gICAgICAgICAgJ3dpdGhDcmVkZW50aWFscyc6IHNjb3BlLnBkZi51c2VDcmVkZW50aWFsc1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGlmIChodHRwSGVhZGVycykge1xuICAgICAgICAvLyAgIHBhcmFtcy5odHRwSGVhZGVycyA9IGh0dHBIZWFkZXJzO1xuICAgICAgICAvLyB9XG5cbiAgICAgICAgaWYgKHNjb3BlLnBkZi51cmwgJiYgc2NvcGUucGRmLnVybC5sZW5ndGgpIHtcbiAgICAgICAgICBQREZKUy5kaXNhYmxlV29ya2VyID0gdHJ1ZTtcbiAgICAgICAgICBwZGZMb2FkZXJUYXNrID0gUERGSlMuZ2V0RG9jdW1lbnQocGFyYW1zKTtcbiAgICAgICAgICBwZGZMb2FkZXJUYXNrLm9uUHJvZ3Jlc3MgPSBzY29wZS5vblByb2dyZXNzO1xuICAgICAgICAgIHBkZkxvYWRlclRhc2sub25QYXNzd29yZCA9IG9uUGFzc3dvcmQoc2NvcGUucGRmLnBhc3N3b3JkLCBzY29wZS5vbkluY29ycmVjdFBhc3N3b3JkKTtcbiAgICAgICAgICBwZGZMb2FkZXJUYXNrLnRoZW4oXG4gICAgICAgICAgICBfcGRmRG9jID0+IHtcbiAgICAgICAgICAgICAgcnVuX3N1Y2Nlc3NfaG9vaygpXG5cbiAgICAgICAgICAgICAgcGRmRG9jID0gX3BkZkRvYztcblxuICAgICAgICAgICAgICBjbGVhckNhbnZhcygpO1xuXG4gICAgICAgICAgICAgIGZvciAodmFyIG51bSA9IDE7IG51bSA8PSBfcGRmRG9jLm51bVBhZ2VzOyBudW0rKykge1xuICAgICAgICAgICAgICAgICAgcmVuZGVyUGFnZShudW0pOyAgICAgICAgICAgXG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHNjb3BlLnBkZi5wYWdlQ291bnQgPSBfcGRmRG9jLm51bVBhZ2VzO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgcnVuX2Vycm9yX2hvb2soZXJyb3IpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzY29wZS4kd2F0Y2goKCkgPT4geyByZXR1cm4gc2NvcGUucGRmLnNjYWxlIH0sIChuZXdWYWwsIG9sZFZhbCkgPT4ge1xuICAgICAgICBpZiAobmV3VmFsICE9PSBvbGRWYWwpIHtcbiAgICAgICAgICByZW5kZXJQREYoKTsgICAgICAgICAgXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBzY29wZS4kd2F0Y2goKCkgPT4geyByZXR1cm4gc2NvcGUucGRmLmZpdFRvUGFnZSB9LCAobmV3VmFsLCBvbGRWYWwpID0+IHtcbiAgICAgICAgaWYgKG5ld1ZhbCAhPT0gb2xkVmFsICYmIG5ld1ZhbCA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJlbmRlclBERigpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcnVuX3N1Y2Nlc3NfaG9vayA9ICgpID0+IHtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNGdW5jdGlvbihzY29wZS5vblN1Y2Nlc3MpKSB7XG4gICAgICAgICAgc2NvcGUub25TdWNjZXNzKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJ1bl9lcnJvcl9ob29rID0gKGVycm9yKSA9PiB7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRnVuY3Rpb24oc2NvcGUub25FcnJvcikpIHtcbiAgICAgICAgICBzY29wZS5vbkVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1dXG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL3NyYy9hbmd1bGFyLXBkZi5kaXJlY3RpdmUuanNcbi8vIG1vZHVsZSBpZCA9IC4vc3JjL2FuZ3VsYXItcGRmLmRpcmVjdGl2ZS5qc1xuLy8gbW9kdWxlIGNodW5rcyA9IDAiLCJleHBvcnQgY29uc3QgTmdQZGZGYWN0b3J5ID0gZnVuY3Rpb24gKCkge1xuICAnbmdJbmplY3QnO1xuXG4gIGNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xuICAgIGN1cnJlbnRQYWdlOiAxLFxuICAgIGZpdFRvUGFnZTogZmFsc2UsXG4gICAgaHR0cEhlYWRlcnM6IG51bGwsXG4gICAgc2NhbGU6IDEsXG4gICAgdXNlQ3JlZGVudGlhbHM6IGZhbHNlLFxuICAgIHBhc3N3b3JkOiBudWxsLFxuICAgIHJvdGF0aW9uOiAwLFxuICAgIHBhZ2VDb3VudDogbnVsbCxcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24gKHVybCwgb3B0cykge1xuICAgIGxldCBzZWxmID0gdGhpc1xuXG4gICAgbGV0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0cylcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndXJsJywge1xuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB1cmxcbiAgICB9KTtcblxuICAgIC8vIGRlZmluZWQgYWxsIHByb3BlcnRpZXMgaW4gZGVmYXVsdE9wdGlvbnMgYW5kIG9wdHMgYXMgcHJvcGVydHkgb2YgdGhpcyBvYmplY3RcbiAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKChlKSA9PiB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoc2VsZiwgZSwge1xuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBzZXQ6ICh2YWx1ZSkgPT4geyBvcHRpb25zW2VdID0gdmFsdWUgfSxcbiAgICAgICAgZ2V0OiAoKSA9PiB7IHJldHVybiBvcHRpb25zW2VdIH1cbiAgICAgIH0pO1xuICAgIH0pXG5cbiAgICB0aGlzLmdvUHJldmlvdXMgPSAoKSA9PiB7XG4gICAgICBpZiAob3B0aW9ucy5jdXJyZW50UGFnZSA8PSAxKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMuY3VycmVudFBhZ2UgLT0gMTtcbiAgICB9O1xuXG4gICAgdGhpcy5nb05leHQgPSAoKSA9PiB7XG4gICAgICBpZiAob3B0aW9ucy5jdXJyZW50UGFnZSA+PSBvcHRpb25zLnBhZ2VDb3VudCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBvcHRpb25zLmN1cnJlbnRQYWdlICs9IDE7XG4gICAgfTtcblxuICAgIHRoaXMuem9vbUluID0gKCkgPT4ge1xuICAgICAgb3B0aW9ucy5maXRUb1BhZ2UgPSBmYWxzZTtcbiAgICAgIG9wdGlvbnMuc2NhbGUgPSBwYXJzZUZsb2F0KG9wdGlvbnMuc2NhbGUpICsgMC4yXG4gICAgfTtcblxuICAgIHRoaXMuem9vbU91dCA9ICgpID0+IHtcbiAgICAgIG9wdGlvbnMuZml0VG9QYWdlID0gZmFsc2U7XG4gICAgICBvcHRpb25zLnNjYWxlID0gcGFyc2VGbG9hdChvcHRpb25zLnNjYWxlKSAtIDAuMlxuICAgIH07XG5cbiAgICB0aGlzLmZpdCA9ICgpID0+IHtcbiAgICAgIG9wdGlvbnMuZml0VG9QYWdlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLnJvdGF0ZUxlZnQgPSAoKSA9PiB7XG4gICAgICBvcHRpb25zLnJvdGF0aW9uID0gKChvcHRpb25zLnJvdGF0aW9uID09PSAwID8gMzYwIDogb3B0aW9ucy5yb3RhdGlvbikgLSA5MCk7XG4gICAgfTtcblxuICAgIHRoaXMucm90YXRlUmlnaHQgPSAoKSA9PiB7XG4gICAgICBvcHRpb25zLnJvdGF0aW9uID0gKG9wdGlvbnMucm90YXRpb24gKyA5MCkgJSAzNjA7XG4gICAgfTtcblxuICAgIHRoaXMuZ29Ub1BhZ2UgPSAocGFnZU51bSkgPT4ge1xuICAgICAgcGFnZU51bSA9IHBhcnNlSW50KHBhZ2VOdW0pO1xuICAgICAgaWYgKHBhZ2VOdW0gIT09IE5hTiAmJiBwYWdlTnVtID4gMCAmJiBwYWdlTnVtIDwgb3B0aW9ucy5wYWdlQ291bnQpIHtcbiAgICAgICAgb3B0aW9ucy5jdXJyZW50UGFnZSA9IHBhZ2VOdW07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcbn1cblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FuZ3VsYXItcGRmLmZhY3RvcnkuanNcbi8vIG1vZHVsZSBpZCA9IC4vc3JjL2FuZ3VsYXItcGRmLmZhY3RvcnkuanNcbi8vIG1vZHVsZSBjaHVua3MgPSAwIiwiaW1wb3J0IGFuZ3VsYXIgZnJvbSAnYW5ndWxhcic7XG5pbXBvcnQgeyBOZ1BkZiB9IGZyb20gJy4vYW5ndWxhci1wZGYuZGlyZWN0aXZlJ1xuaW1wb3J0IHsgTmdQZGZGYWN0b3J5IH0gZnJvbSAnLi9hbmd1bGFyLXBkZi5mYWN0b3J5J1xuXG5leHBvcnQgY29uc3QgUGRmID0gYW5ndWxhclxuICAubW9kdWxlKCdwZGYnLCBbXSlcbiAgLmRpcmVjdGl2ZSgnbmdQZGYnLCBOZ1BkZilcbiAgLmZhY3RvcnkoJ05nUGRmRmFjdG9yeScsIE5nUGRmRmFjdG9yeSlcbiAgLm5hbWU7XG5cbmV4cG9ydCBkZWZhdWx0IFBkZjtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vc3JjL2FuZ3VsYXItcGRmLm1vZHVsZS5qc1xuLy8gbW9kdWxlIGlkID0gLi9zcmMvYW5ndWxhci1wZGYubW9kdWxlLmpzXG4vLyBtb2R1bGUgY2h1bmtzID0gMCIsIm1vZHVsZS5leHBvcnRzID0gX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV8wX187XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gZXh0ZXJuYWwgXCJhbmd1bGFyXCJcbi8vIG1vZHVsZSBpZCA9IDBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sInNvdXJjZVJvb3QiOiIifQ==