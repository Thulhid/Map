"use strict";

const form = document.querySelector(".form");
const inputDuration = document.querySelector(".form__input--duration");
const inputDistance = document.querySelector(".form__input--distance");
const inputCadence = document.querySelector(".form__input--cadence");
const inputDescription = document.querySelector(".form__input--description");
const inputTitle = document.querySelector(".form__input--title");
const inputType = document.querySelector(".form__input--type");
class Performer {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  constructor(coords, title, duration) {
    this.coords = coords;
    this.title = title;
    this.duration = duration;
  }
  _setInfo() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.info = `${this.type.replace(
      this.type[0],
      this.type[0].toUpperCase()
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

// const x = new Performer(1234, "Hiruna", 23, "running");
// x._setDescription();
// console.log(x);

class Working extends Performer {
  type = "working";
  constructor(coords, title, duration, description) {
    super(coords, title, duration);
    this.description = description;
    this._setInfo();
  }
}

class Running extends Performer {
  type = "running";
  constructor(coords, title, duration, distance, cadence) {
    super(coords, title, duration);
    this.distance = distance;
    this.cadence = cadence;
    this._setInfo();
    this._calcPace();
  }
  _calcPace() {
    this.pace = this.duration / this.distance;

    return this.pace;
  }
}

class App {
  #map;
  #performs = [];
  #mapEvent;
  constructor() {
    this._getPosition();
    form.addEventListener("submit", this._newPerform.bind(this));
    inputType.addEventListener("change", this._toggleFields);
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          window.alert("Could not get your position");
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    //Info: assign value for #map
    this.#map = L.map("map").setView(coords, 15);
    L.tileLayer("https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Note: call _showForm
    this.#map.on("click", this._showForm.bind(this));
  }

  _toggleFields() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputDistance.closest(".form__row").classList.toggle("form__row--hidden");
    inputDescription
      .closest(".form__row")
      .classList.toggle("form__row--hidden");
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputTitle.focus();
  }
  _hideForm() {
    inputTitle.value =
      inputDescription.value =
      inputDuration.value =
      inputCadence.value =
      inputDistance.value =
        "";
    form.classList.add("hidden");
  }
  _newPerform(e) {
    e.preventDefault();
    let perform;
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    //Info: get data from form
    const type = inputType.value;
    const duration = +inputDuration.value;
    const title = inputTitle.value;
    const { lat, lng } = this.#mapEvent.latlng;
    //Info: if working, working object
    if (type === "working") {
      const description = inputDescription.value;
      //Info: Check if data is valid
      if (!validInputs(duration) || !allPositive(duration))
        return window.alert("Input have to be positive numbers!");
      perform = new Working([lat, lng], title, duration, description);
    }

    //Info: if running, running object

    if (type === "running") {
      const distance = +inputDistance.value;
      const cadence = +inputCadence.value;
      //Info: Check if data is valid
      if (
        !validInputs(duration, distance, cadence) ||
        !allPositive(duration, distance, cadence)
      )
        return window.alert("Input have to be positive numbers!");
      perform = new Running([lat, lng], title, duration, distance, cadence);
    }
    //Info: add new object to performs array
    this.#performs.push(perform);
    //Info: render perform on map as a marker
    this._renderWorkoutMarker(perform);
    //Info: render perform on list
    //Info: hide the form + clear input fields
    this._hideForm();
    //Info: Set Local storage to the all performs
  }
  _renderWorkoutMarker(performer) {
    L.marker(performer.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${performer.type}-popup`,
        })
      )
      .setPopupContent(
        `${performer.type === "running" ? "🏃‍♂️" : "👨‍💻"} ${performer.info}`
      )
      .openPopup();
    console.log(this.#performs);
  }
}

const app = new App();
