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
const sideIcons = document.querySelector(".side_icons");
const cmbSort = document.querySelector(".cmb_sort");
const cmbGroup = document.querySelector(".cmb_group");
const modal = document.querySelector(".modal");
const modalTitle = document.querySelector(".modal_title");
const modalMsg = document.querySelector(".modal_msg");
const overlay = document.querySelector(".overlay");
let btnModal = document.querySelector(".btn_modal");
const btnModalClose = document.querySelector(".close_modal");
const btnShowAllPerforms = document.querySelector(".show_all_performs");
const drawControl = document.querySelector(".draw_control");

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
  #drawnItems;
  //#markers = {};
  constructor() {
    this._getPosition();
    btnFormOk.addEventListener("click", this._newPerform.bind(this));
    inputType.addEventListener("change", this._toggleFields);
    this._getLocalStorage();
    cmbSort.addEventListener("change", this._sort.bind(this));
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
    this._toggleCmb(true);
    cmbSort.addEventListener("change", this._sort.bind(this));
    cmbGroup.addEventListener("change", this._group.bind(this));
    containerPerform.addEventListener("mouseover", this._cmbOver);
    containerPerform.addEventListener("mouseout", this._cmbOut);
    btnShowAllPerforms.addEventListener(
      "click",
      this._showAllPerforms.bind(this)
    );
    drawControl.addEventListener("click", this._drawControl.bind(this));
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
    this._toggleCmb(false);
    btnDeleteAll.classList.add("hidden");
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
      ) {
        this._toggleModal(
          true,
          "warning Invalid data",
          "Input have to be positive numbers! & maximum 35 characters",
          "Ok"
        );

        return;
      }
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
      ) {
        this._toggleModal(
          true,
          "warning Invalid data",
          "Input have to be positive numbers! & maximum 35 characters",
          "Ok"
        );

        //return window.alert("Input have to be positive numbers!");
        return;
      }
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
    //Info: Display sort and group dropdown
    this._toggleCmb(true);

    console.log(this.#performs);
    containerPerform.addEventListener("mouseover", this._cmbOver);
    containerPerform.addEventListener("mouseout", this._cmbOut);
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
    <span class="perform__icon material-symbols-outlined">${
      perform.type === "running" ? "directions_run" : "business_center"
    }</span>
            <span class="perform__value">${perform.title}</span>
            </div>
            <div class="perform__details">
            <span class="perform__icon material-symbols-outlined">timelapse</span>
            <span class="perform__value">${perform.duration}</span>
            <span class="perform__unit">min</span>
          </div>
    `;
    if (perform.type === "working") {
      html += `<div class="perform__details">
      <span class="perform__icon material-symbols-outlined">description</span>
       <span class="perform__value"> ${perform.description} </span>
       </div>
       <div class="perform__details">
       <input type="button" value="delete" class="btn_close material-symbols-outlined">
       <input type="button" value="edit" class="btn_edit material-symbols-outlined">
       </div>
      </li>`;
    }
    if (perform.type === "running")
      html += `
      <div class="perform__details">
    <span class="perform__icon material-symbols-outlined">laps</span>
     <span class="perform__value">${perform.distance}</span>
      <span class="perform__unit">km</span>
      </div>
      <div class="action__details">
      <input type="button" value="delete" class="btn_close material-symbols-outlined">
      <input type="button" value="edit" class="btn_edit material-symbols-outlined">
      </div>
      </li>
    `;

    if (existingElement) {
      existingElement.outerHTML = html;
    } else {
      sideIcons.insertAdjacentHTML("afterend", html);
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
    const dataDraw = JSON.parse(localStorage.getItem("drawnShapes"));
    //console.log(dataDraw);
    if (!data) return;
    this.#performs = data;
    this.#performs.forEach((perform) => this._renderPerform(perform));
    // if (!dataDraw) return;
    // L.geoJSON(dataDraw).eachLayer((layer) => {
    //   this.#drawnItems?.addLayer(layer);
    // });
    // this.#map?.addLayer(this.#drawnItems);
    // console.log(this.#drawnItems);
  }

  reset() {
    localStorage.removeItem("perform");
    cmbSort.classList.add("hidden");
    window.location.reload();
  }
  _displayDeleteAll() {
    btnDeleteAll.classList.remove("hidden");
    btnDeleteAll.addEventListener("click", () => {
      this._toggleModal(
        true,
        "delete Confirm deletion",
        "Are you sure you want to delete all perform data?",
        "Delete all"
      );
      btnModal.addEventListener("click", () => {
        this.reset();
      });
    });
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
    this._toggleModal(
      true,
      "delete Confirm deletion",
      "Are you sure you want to delete following perform data?",
      "Delete"
    );

    const handleDeleteClick = () => {
      const performEl = e.target.closest(".perform");
      if (!performEl) return;
      //Note: Find and remove the perform object
      const performIndex = this.#performs.findIndex((perform) => {
        return perform.id === performEl.dataset.id;
      });

      const [removedPerform] = this.#performs.splice(performIndex, 1);
      console.log(removedPerform);
      //Note: Remove the marker from the map
      this.#map.removeLayer(removedPerform?.marker);
      // delete this.#markers[removedPerform.id];
      //Note: remove perform on the UI
      performEl.closest(".perform").remove();
      //Note: Update local storage after deletion
      this._setLocalStorage();

      if (this.#performs.length == 0) {
        btnDeleteAll.classList.add("hidden");
      }
      btnModal.removeEventListener("click", handleDeleteClick);
    };
    btnModal.replaceWith(btnModal.cloneNode(true));
    btnModal = document.querySelector(".btn_modal");
    btnModal?.addEventListener("click", handleDeleteClick);
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
    this._toggleCmb(false);
    btnDeleteAll.classList.add("hidden");
    const handleEditClick = (ev) => {
      ev.preventDefault();
      e.target.disabled = true;
      e.target.style.opacity = 1;

      if (
        !this._checkValidNum(+inputDuration.value) ||
        !this._checkValidWord(inputTitle.value)
      ) {
        this._toggleModal(
          true,
          "warning Invalid data",
          "Input have to be positive numbers! & maximum 35 characters",
          "Ok"
        );
        btnModal.classList.add("btn__form__edit");
        modal.style.height = "22rem";
        modal.addEventListener("click", (e) => {
          if (e.target.classList.contains("btn_modal")) {
            btnModal.classList.remove("btn__form__edit");
          } else if (e.target.classList.contains("close_modal")) {
            btnModal.classList.remove("btn__form__edit");
          }
        });
        return;
      }
      performObj.duration = +inputDuration.value;
      performObj.title = this._checkValidWord(inputTitle.value);
      if (performObj.type === "working") {
        if (!this._checkValidWord(inputDescription.value))
          return this._toggleModal(
            true,
            "warning Invalid data",
            "Input have to be maximum 35 characters",
            "Ok"
          );
        performObj.description = this._checkValidWord(inputDescription.value);
      } else if (performObj.type === "running") {
        if (!this._checkValidNum(+inputDistance.value))
          return this._toggleModal(
            true,
            "warning Invalid data",
            "Input have to be positive numbers!",
            "Ok"
          );
        performObj.distance = this._checkValidNum(+inputDistance.value);
      }

      this._renderPerform(performObj);
      this._hideForm();
      inputType.disabled = false;
      this._setLocalStorage();
      btnFormEdit.classList.add("hidden");
      btnFormOk.classList.remove("hidden");
      this._toggleCmb(true);
      btnDeleteAll.classList.remove("hidden");
      btnFormEdit.removeEventListener("click", handleEditClick);
    };
    // Ensure there's only one event listener
    btnFormEdit.replaceWith(btnFormEdit.cloneNode(true));
    btnFormEdit = document.querySelector(".btn__form__edit");
    btnFormEdit?.addEventListener("click", handleEditClick);
  }

  _sort() {
    if (cmbSort.value === "distance") {
      this._getLocalStorage();
    }

    if (cmbSort.value === "distance-asc")
      this.#performs.sort((a, b) => b.duration - a.duration);
    else if (cmbSort.value === "distance-desc")
      this.#performs.sort((a, b) => a.duration - b.duration);

    const performContainer = document.querySelectorAll(".perform");

    if (performContainer)
      performContainer.forEach((perform) => perform.remove());
    this.#performs.forEach((perform) => this._renderPerform(perform));
  }
  _group() {
    if (cmbGroup.value === "group by") {
      this._getLocalStorage();
    } else if (cmbGroup.value === "working") {
      this._getLocalStorage();

      this.#performs = this.#performs.filter(
        (perform) => perform.type === "working"
      );
    } else if (cmbGroup.value === "running") {
      this._getLocalStorage();

      this.#performs = this.#performs.filter(
        (perform) => perform.type === "running"
      );
    }
    const performContainer = document.querySelectorAll(".perform");

    if (performContainer)
      performContainer.forEach((perform) => perform.remove());
    this.#performs.forEach((perform) => this._renderPerform(perform));
    cmbGroup.removeEventListener("focus", this._group.bind(this));
  }
  _cmbOver(e) {
    if (
      !e.target.classList.contains("cmb_group") &&
      !e.target.classList.contains("cmb_sort")
    )
      return;

    if (e.target.classList.contains("cmb_group")) {
      const groupSelectedOption = cmbGroup.options[0];
      groupSelectedOption.text = "default";
    }
    if (e.target.classList.contains("cmb_sort")) {
      const sortSelectedOption = cmbSort.options[0];
      sortSelectedOption.text = "default";
    }
    [...cmbGroup.options].forEach((option) => {
      option.disabled = false;
    });
  }
  _cmbOut() {
    const groupSelectedOption = cmbGroup.options[0];
    groupSelectedOption.text = "Group by";
    const sortSelectedOption = cmbSort.options[0];
    sortSelectedOption.text = "Sort by";
    [...cmbGroup.options].forEach((option) => {
      option.disabled = true;
    });
  }

  _toggleCmb(isOpen) {
    if (isOpen) {
      cmbSort.classList.remove("hidden");
      cmbGroup.classList.remove("hidden");
    } else {
      cmbSort.classList.add("hidden");
      cmbGroup.classList.add("hidden");
    }
  }
  _toggleModal(isOpen, title, msg, btnValue) {
    if (isOpen) {
      modal.classList.remove("hidden");
      overlay.classList.remove("hidden");
      modalTitle.textContent = title;
      modalMsg.textContent = msg;
      btnModal.value = btnValue;
      modal.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn_modal")) {
          this._toggleModal(false);
        } else if (e.target.classList.contains("close_modal")) {
          this._toggleModal(false);
        }
      });
    } else {
      modal.classList.add("hidden");
      overlay.classList.add("hidden");
      modal.style.height = "";
    }
  }
  _showAllPerforms() {
    const markers = this.#performs.map((perform) => perform.marker._latlng);
    const bounds = L.latLngBounds(markers);
    this.#map.fitBounds(bounds);
  }
  _drawControl() {
    const drawControl = new L.Control.Draw({
      draw: {
        polyline: true, // Enable drawing lines
        polygon: true, // Enable drawing polygons
        rectangle: true, // Enable drawing rectangles
        circle: true, // Enable drawing circles
        marker: true, // Enable adding markers
      },
      edit: {
        featureGroup: new L.FeatureGroup().addTo(this.#map),
      },
    });
    this.#map.addControl(drawControl);
    this.#drawnItems = new L.FeatureGroup();

    this.#map.on("draw:created", (event) => {
      console.log(event);

      this.#map.addLayer(this.#drawnItems);

      this.#drawnItems.addLayer(event.layer);
      // const data = this.#drawnItems.toGeoJSON();
      //localStorage.setItem("drawnShapes", JSON.stringify(data));

      // if (event.layerType === "polyline" || event.layerType === "polygon") {
      //   console.log("Coordinates:", layer.getLatLngs());
      // } else if (event.layerType === "marker") {
      //   console.log("Coordinates:", layer.getLatLng());
      // }
    });
  }
}

const app = new App();
