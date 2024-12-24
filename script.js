"use strict";
const form = document.querySelector(".form");
let btnFormEdit = document.querySelector(".btn__form__edit");
const btnFormOk = document.querySelector(".btn__form__ok");
const containerPerform = document.querySelector(".performs");
const inputDuration = document.querySelector(".form__input--duration");
const inputDistance = document.querySelector(".form__input--distance");
const inputCadence = document.querySelector(".form__input--cadence");
const inputDescription = document.querySelector(".form__input--description");
const inputTitle = document.querySelector(".form__input--title");
const inputType = document.querySelector(".form__input--type");
const btnDeleteAll = document.querySelector(".btn_delete_all");

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
  constructor(coords, title, duration, distance) {
    super(coords, title, duration);
    this.distance = distance;
    this._setInfo();
  }
}
class App {
  #map;
  #performs = [];
  #mapEvent;
  //#markers = {};
  constructor() {
    console.log(this.#performs);
    this._getPosition();
    btnFormOk.addEventListener("click", this._newPerform.bind(this));
    inputType.addEventListener("change", this._toggleFields);
    this._getLocalStorage();
    containerPerform.addEventListener("click", this._moveToPopup.bind(this));
    containerPerform.addEventListener("click", (e) => {
      if (!e.target.classList.contains("btn_close")) return;
      this._deleteItem(e);
    });
    containerPerform.addEventListener("click", (e) => {
      if (!e.target.classList.contains("btn_edit")) return;

      const existingElements = document.querySelectorAll(
        this.#performs.map((perform) => `[data-id="${perform.id}"]`).join(", ")
      );
      existingElements.forEach((element) => {
        element.querySelector(".btn_edit").disabled = false;
        element.querySelector(".btn_edit").style.opacity = 1;
      });
      e.target.disabled = true;
      e.target.style.opacity = 0.5;
      this._editItem(e);
    });
    if (this.#performs.length === 0) return;
    this._displayDeleteAll();
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
    this.#map.on("popupopen", function (e) {
      const popup = e.popup;
      const popupNode = popup.getElement();
    });
  }

  _toggleFields() {
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

    const wordsInRange = (words) => {
      if (words.length > 35) return false;

      return words.split(" ").reduce((acc, word) => {
        if (word.length > 8) {
          // Split long words into chunks of 10
          let splitWord = word.match(/.{1,10}/g).join("\n");
          return acc + splitWord + "\n";
        }
        return acc + word + "\n";
      }, "");
    };

    //Info: get data from form
    const type = inputType.value;
    const duration = +inputDuration.value;
    const title = inputTitle.value;
    const { lat, lng } = this.#mapEvent.latlng;
    //Info: if working, working object
    if (type === "working") {
      const description = inputDescription.value;
      //Info: Check if data is valid
      if (
        !this._checkValidNum(duration) ||
        !this._checkValidWord(description) ||
        !this._checkValidWord(title)
      )
        return window.alert(
          "Input have to be positive numbers! & maximum 35 characters"
        );
      perform = new Working(
        [lat, lng],
        this._checkValidWord(title),
        duration,
        this._checkValidWord(description)
      );
    }
    //Info: if running, running object
    if (type === "running") {
      const distance = +inputDistance.value;
      //Info: Check if data is valid
      if (
        !validInputs(duration, distance) ||
        !allPositive(duration, distance) ||
        !wordsInRange(title)
      )
        return window.alert("Input have to be positive numbers!");
      perform = new Running(
        [lat, lng],
        wordsInRange(title),
        duration,
        distance
      );
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
    this._setLocalStorage();
    //Info: Display delete all button
    this._displayDeleteAll();
    console.log(this.#performs);
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
    const existingElement = document.querySelector(`[data-id="${perform.id}"]`);
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

      html += `<div class="perform__details">
      <span class="perform__icon">📝</span>
       <span class="perform__value"> ${perform.description} </span>
       </div>
       <div class="perform__details">
       <input type="button" value="delete" class="btn_close material-icons">
       <input type="button" value="edit" class="btn_edit material-icons">
       </div>
      </li>`;
    }
    if (perform.type === "running")
      html += `
      <div class="perform__details">
    <span class="perform__icon">🏁</span>
     <span class="perform__value">${perform.distance}</span>
      <span class="perform__unit">km</span>
      </div>
      <div class="action__details">
      <input type="button" value="delete" class="btn_close material-icons">
      <input type="button" value="edit" class="btn_edit material-icons">
      </div>
      </li>
    `;

    if (existingElement) {
      existingElement.outerHTML = html;
    } else {
      btnDeleteAll.insertAdjacentHTML("afterend", html);
    }
  }
  _setLocalStorage() {
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
    this._setLocalStorage();

    if (this.#performs.length == 0) {
      btnDeleteAll.classList.add("hidden");
    }
  }
  _checkValidNum(...inputs) {
    return inputs.every((inp) => inp > 0 && Number.isFinite(inp));
  }

  _checkValidWord(...inputs) {
    if (
      !inputs.every((words) => typeof words === "string" && words.length < 35)
    ) {
      return false;
    }
    const validWord = inputs.map((words) => {
      return words.split(" ").reduce((acc, word) => {
        if (word.length > 8) {
          // Split long words into chunks of 10
          let splitWord = word.match(/.{1,10}/g).join("\n");
          return acc + splitWord + "\n";
        }
        return acc + word + "\n";
      }, "");
    });

    return String(validWord);
  }

  _editItem(e) {
    const performEl = e.target.closest(".perform");
    if (!performEl) return;

    const performObj = this.#performs.find((perform) => {
      return perform.id === performEl.dataset.id;
    });

    inputType.value = performObj.type;
    inputDuration.value = performObj.duration;
    inputTitle.value = performObj.title.replace(/\n/g, " ").trim();
    console.log(typeof performObj.title); // Logs the type
    console.log(performObj); // Logs the value

    if (performObj.type === "working") {
      inputDistance.closest(".form__row").classList.add("form__row--hidden");
      inputDescription
        .closest(".form__row")
        .classList.remove("form__row--hidden");

      inputDescription.value = performObj.description
        .replace(/\n/g, " ")
        .trim();
    } else if (performObj.type === "running") {
      inputDistance.closest(".form__row").classList.remove("form__row--hidden");
      inputDescription.closest(".form__row").classList.add("form__row--hidden");
      inputDistance.value = performObj.distance;
    }

    form.classList.remove("hidden");
    inputType.disabled = true;
    inputTitle.focus();
    btnFormEdit.classList.remove("hidden");
    btnFormOk.classList.add("hidden");

    const handleEditClick = (ev) => {
      ev.preventDefault();
      e.target.disabled = true;
      e.target.style.opacity = 1;

      if (
        !this._checkValidNum(+inputDuration.value) ||
        !this._checkValidWord(inputTitle.value)
      )
        return window.alert(
          "Input have to be positive numbers! & maximum 35 characters"
        );
      performObj.duration = +inputDuration.value;
      performObj.title = this._checkValidWord(inputTitle.value);
      if (performObj.type === "working") {
        if (!this._checkValidWord(inputDescription.value))
          return window.alert("Input have to be maximum 35 characters");
        performObj.description = this._checkValidWord(inputDescription.value);
      } else if (performObj.type === "running") {
        if (!this._checkValidNum(+inputDistance.value))
          return window.alert("Input have to be positive numbers!");
        performObj.distance = this._checkValidNum(+inputDistance.value);
      }

      this._renderPerform(performObj);
      this._hideForm();
      inputType.disabled = false;
      this._setLocalStorage();
      btnFormEdit.classList.add("hidden");
      btnFormOk.classList.remove("hidden");
      btnFormEdit.removeEventListener("click", handleEditClick);
    };
    // Ensure there's only one event listener
    btnFormEdit.replaceWith(btnFormEdit.cloneNode(true));
    btnFormEdit = document.querySelector(".btn__form__edit");
    btnFormEdit?.addEventListener("click", handleEditClick);
  }
}

const app = new App();
