const burger = document.querySelector(".icon");
const closer = document.querySelector(".close");
const navbar = document.querySelector(".responsive-navbar");
burger.addEventListener("click", () => {
  closer.style.display = "flex";
  burger.style.display = "none";
  navbar.style.display = "flex";
});
closer.addEventListener("click", () => {
  burger.style.display = "flex";
  closer.style.display = "none";
  navbar.style.display = "none";
});
///////////////////////////////////////
// Slider
const slider = function () {
  const slides = document.querySelectorAll(".slide");
  const btnLeft = document.querySelector(".slider__btn--left");
  const btnRight = document.querySelector(".slider__btn--right");
  const dotContainer = document.querySelector(".dots");

  let curSlide = 0;
  const maxSlide = slides.length;

  // Functions
  const createDots = function () {
    slides.forEach(function (_, i) {
      dotContainer.insertAdjacentHTML(
        "afterbegin",
        `<button class="dots__dot" data-slide="${i}"></button>`
      );
    });
  };

  const activateDot = function (slide) {
    document
      .querySelectorAll(".dots__dot")
      .forEach((dot) => dot.classList.remove("dots__dot--active"));

    document
      .querySelector(`.dots__dot[data-slide="${slide}"]`)
      .classList.add("dots__dot--active");
  };

  const goToSlide = function (slide) {
    slides.forEach(
      (s, i) => (s.style.transform = `translateX(${100 * (i - slide)}%)`)
    );
  };

  // Next slide
  const nextSlide = function () {
    if (curSlide === maxSlide - 1) {
      curSlide = 0;
    } else {
      curSlide++;
    }

    goToSlide(curSlide);
    activateDot(curSlide);
  };

  const prevSlide = function () {
    if (curSlide === 0) {
      curSlide = maxSlide - 1;
    } else {
      curSlide--;
    }
    goToSlide(curSlide);
    activateDot(curSlide);
  };

  const init = function () {
    goToSlide(0);
    createDots();

    activateDot(0);
  };
  init();

  // Event handlers
  btnRight.addEventListener("click", nextSlide);
  btnLeft.addEventListener("click", prevSlide);

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") prevSlide();
    e.key === "ArrowRight" && nextSlide();
  });
  console.log("");

  dotContainer.addEventListener("click", function (e) {
    if (e.target.classList.contains("dots__dot")) {
      const { slide } = e.target.dataset;

      goToSlide(slide);
      activateDot(slide);
    }
  });
};
slider();

/* const prices__free = document.querySelector(".column1");
const prices__silver = document.querySelector(".column2");
const prices__silverplus = document.querySelector(".column3");
const prices__main = document.querySelector(".column4");
const column1 = document.querySelector(".column1 h1");
const column2 = document.querySelector(".column2 h1");
const column3 = document.querySelector(".column3 h1");
const column4 = document.querySelector(".column4 h1");

console.log(burger);

column1.addEventListener("click", () => {
  prices__free.classList.add("active");
  prices__main.classList.remove("active");
  prices__silver.classList.remove("active");
  prices__silverplus.classList.remove("active");
});
column2.addEventListener("click", () => {
  prices__silver.classList.add("active");
  prices__main.classList.remove("active");
  prices__silverplus.classList.remove("active");
  prices__free.classList.remove("active");
});
column3.addEventListener("click", () => {
  prices__silverplus.classList.add("active");
  prices__main.classList.remove("active");
  prices__silver.classList.remove("active");
  prices__free.classList.remove("active");
});
column4.addEventListener("click", () => {
  prices__main.classList.add("active");
  prices__silverplus.classList.remove("active");
  prices__silver.classList.remove("active");
  prices__free.classList.remove("active");
});
 */
