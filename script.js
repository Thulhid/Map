"use strict";

const form = document.querySelector(".form");
const containerPerform = document.querySelector(".performs");
const inputDuration = document.querySelector(".form__input--duration");
const inputDistance = document.querySelector(".form__input--distance");
const inputCadence = document.querySelector(".form__input--cadence");
const inputDescription = document.querySelector(".form__input--description");
const inputTitle = document.querySelector(".form__input--title");
const inputType = document.querySelector(".form__input--type");
const btnDeleteAll = document.querySelector(".delete_all_btn");

class Perform {
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

class Working extends Perform {
  type = "working";
  constructor(coords, title, duration, description) {
    super(coords, title, duration);
    this.description = description;
    this._setInfo();
  }
}

class Running extends Perform {
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
  //#markers = {};
  constructor() {
    this._getPosition();
    form.addEventListener("submit", this._newPerform.bind(this));
    inputType.addEventListener("change", this._toggleFields);
    this._getLocalStorage();
    containerPerform.addEventListener("click", this._moveToPopup.bind(this));
    containerPerform.addEventListener("click", (e) => {
      if (!e.target.classList.contains("close-modal")) return;
      this._deleteItem(e);
    });
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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Note: call _showForm
    this.#map.on("click", this._showForm.bind(this));
    this.#performs.forEach((perform) => this._renderPerformMarker(perform));
    if (this.#performs.length === 0) return;
    this._displayDeleteAll();
    this.#map.on("popupopen", function (e) {
      const popup = e.popup;
      const popupNode = popup.getElement();
    });
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
    this._renderPerformMarker(perform);
    //Info: render perform on list
    this._renderPerform(perform);
    //Info: hide the form + clear input fields
    this._hideForm();
    //Info: Set Local storage to the all performs
    this._localStorage();
    //Info: Display delete all button
    this._displayDeleteAll();
  }
  _renderPerformMarker(perform) {
    const marker = L.marker(perform?.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${perform.type}-popup`,
        })
      )
      .setPopupContent(
        `${perform.type === "running" ? "🏃‍♂️" : "👨‍💻"} ${perform.info}`
      )
      .openPopup();
    perform.marker = marker;
    //this.#markers[perform.id] = marker;
  }
  _renderPerform(perform) {
    let html = `
    <li class="perform perform--${perform.type}" data-id="${perform.id}">
    <h2 class="perform__title">${perform.info}</h2>
    <div class="perform__details">
    <span class="perform__icon">${
      perform.type === "running" ? "🏃‍♂️" : "👨‍💻"
    }</span>
            <span class="perform__value">${perform.title}</span>
            </div>
            <div class="perform__details">
            <span class="perform__icon">⏱</span>
            <span class="perform__value">${perform.duration}</span>
            <span class="perform__unit">min</span>
          </div>
    `;
    if (perform.type === "working") {
      const shortedDescription = perform.description.split(" ");
      const [value1, value2] = shortedDescription;

      html += `<div class="perform__details">
      <span class="perform__icon">📝</span>
       <span class="perform__value">${value1} ${value2}...</span>
       <input type="button" value="&times;" class="close-modal">
       </div>

      </li>`;
    }
    if (perform.type === "running")
      html += `
      <div class="perform__details">
    <span class="perform__icon">🦶</span>
     <span class="perform__value">${perform.cadence}</span>
      <span class="perform__unit">spm</span>
      <input type="button" value="&times;" class="close-modal">
      </div>

      <div class="perform__details">
    <span class="perform__icon">🏁</span>
     <span class="perform__value">${perform.distance}</span>
      <span class="perform__unit">km</span>
      </div>
      </li>
    `;
    btnDeleteAll.insertAdjacentHTML("afterend", html);
  }
  _localStorage() {
    const performsData = this.#performs.map((perform) => {
      //Hack: Create a shallow copy excluding the marker property
      const { marker, ...performData } = perform;
      return performData;
    });
    window.localStorage.setItem("perform", JSON.stringify(performsData));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("perform"));
    if (!data) return;
    this.#performs = data;
    this.#performs.forEach((perform) => this._renderPerform(perform));
  }

  reset() {
    localStorage.removeItem("perform");
    window.location.reload();
  }
  _displayDeleteAll() {
    btnDeleteAll.classList.remove("hidden");
    btnDeleteAll.addEventListener("click", this.reset);
  }

  _moveToPopup(e) {
    const performEl = e.target.closest(".perform");
    if (!performEl) return;
    const perform = this.#performs.find(
      (perform) => perform.id === performEl.dataset.id
    );
    if (!perform || !perform.coords) {
      console.error("Invalid perform coordinates.");
      return;
    }
    this.#map.setView(perform?.coords, 15, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _deleteItem(e) {
    const performEl = e.target.closest(".perform");
    if (!performEl) return;
    //Note: Find and remove the perform object

    const performIndex = this.#performs.findIndex((perform) => {
      return perform.id === performEl.dataset.id;
    });

    const [removedPerform] = this.#performs.splice(performIndex, 1);
    //Note: Remove the marker from the map
    this.#map.removeLayer(removedPerform.marker);
    // delete this.#markers[removedPerform.id];
    //Note: remove perform on the UI
    performEl.closest(".perform").remove();
    //Note: Update local storage after deletion
    this._localStorage();

    if (this.#performs.length == 0) {
      btnDeleteAll.classList.add("hidden");
    }
  }
}
const app = new App();
