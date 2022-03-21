"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
	date = new Date();
	id = (Date.now() + "").slice(-10);

	constructor(coords, distance, duration) {
		this.coords = coords; // [lat, lng]
		this.distance = distance; // in km
		this.duration = duration; // in min
	}

	_setDescription() {
		// prettier-ignore
		const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} pada tanggal ${this.date.getDate()} ${months[this.date.getMonth()]}`;
		console.log(this.description);
	}
}

class Running extends Workout {
	type = "running";
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

class Cycling extends Workout {
	type = "cycling";
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}

class App {
	#map; // div buat nampilin map di page
	#mapZoomLevel = 15;
	#mapEvent; //event yang berisi
	#workouts = [];

	constructor() {
		this._getPosition(); // b

		this._getLocalStorage();
		form.addEventListener("submit", this._newWorkout.bind(this));
		inputType.addEventListener("change", this._toggleElevationField);
		containerWorkouts.addEventListener("click", this._moveToPopUp.bind(this));
	}

	_getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
				alert("Error, tidak bisa tampilkan posisi anda sekarang");
			});
		}
	}

	_loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;

		const coords = [latitude, longitude];

		this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

		L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(this.#map);

		this.#map.on("click", this._showForm.bind(this));

		//render workout marker ketika map sudah di render
		this.#workouts.forEach((work) => this._renderWorkoutMarker(work));
	}

	_showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove("hidden");
		inputDistance.focus();
	}

	_hideForm() {
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";

		form.style.display = "none";
		form.classList.add("hidden");
		setTimeout(() => (form.style.display = "grid"), 1000);
	}
	_toggleElevationField() {
		inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
		inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
	}
	_newWorkout(e) {
		//cek apakah data valid (yang dimasukkan angka)

		//akan mereturn true kalau semuanya angka, false jika salahsatunya bukan angka
		const validInput = (...inputs) => inputs.every((inp) => Number.isFinite(inp));

		//akan mereturn true jika semuanya angka dan tidak negatif,
		//akan mereturn false jika salah satunya tidak memenuhi syarat (karena every harus semuanya)
		const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
		e.preventDefault();

		//Ambil data dari form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;
		//kalo workoutnya running, bikin objek running
		if (type === "running") {
			const cadence = +inputCadence.value;

			//cek apakah data valid (yang dimasukkan angka)
			if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence)) {
				return alert("Tolong masukkan angka yang benar");
			}

			//buat objek running
			workout = new Running([lat, lng], distance, duration, cadence);
		}

		//kalo workoutnya cycling, bikin objek cycling
		if (type === "cycling") {
			const elevation = +inputElevation.value;

			//cek apakah data valid (yang dimasukkan angka)
			//elevation boleh minus, jadi tidak di masukkan ke allPositive
			if (!validInput(distance, duration, elevation) || !allPositive(distance, duration)) {
				return alert("Tolong masukkan angka yang benar!");
			}

			//buat objek cycling
			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// push objek (cycling atau running), apapun itu.
		this.#workouts.push(workout);
		console.log(workout);

		//render workout di map sebagai marker
		this._renderWorkoutMarker(workout);

		//render workout di list
		this._renderWorkout(workout);

		//hide map dan clear input

		this._hideForm();

		//simpan ke local storage
		this._setLocalStorage();
	}

	//render workout di map sebagai marker
	_renderWorkoutMarker(workout) {
		L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(L.popup({ maxWidth: 100, minWidth: 200, autoClose: false, closeOnClick: false, className: `${workout.type}-popup` }))
			.setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`)
			.openPopup();
	}

	//render workout di list
	_renderWorkout(workout) {
		let html = `
		<li class="workout workout--${workout.type}" data-id="${workout.id}">
			<h2 class="workout__title">${workout.description}</h2>
			<div class="workout__details">
				<span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
				<span class="workout__value">${workout.distance}</span>
				<span class="workout__unit">km</span>
			</div>
			<div class="workout__details">
				<span class="workout__icon">⏱</span>
				<span class="workout__value">${workout.duration}</span>
				<span class="workout__unit">min</span>
			</div>
		`;

		if (workout.type === "running") {
			html += `<div class="workout__details">
						<span class="workout__icon">⚡️</span>
						<span class="workout__value">${workout.pace.toFixed(1)}</span>
						<span class="workout__unit">min/km</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon">🦶🏼</span>
						<span class="workout__value">${workout.cadence}</span>
						<span class="workout__unit">spm</span>
					</div>
				</li>`;
		}

		if (workout.type === "cycling") {
			html += `<div class="workout__details">
						<span class="workout__icon">⚡️</span>
						<span class="workout__value">${workout.speed.toFixed(1)}</span>
						<span class="workout__unit">km/h</span>
          			</div>
					<div class="workout__details">
						<span class="workout__icon">⛰</span>
						<span class="workout__value">${workout.elevationGain}</span>
						<span class="workout__unit">m</span>
					</div>
				</li>`;
		}

		//masukkin ke ul workouts, tapi select form sebagai sibling, afterend karena kita ingin memasukinya setelah form (jadi form tetap diatas)
		form.insertAdjacentHTML("afterend", html);
	}

	_moveToPopUp(e) {
		const workoutEl = e.target.closest(".workout");
		if (!workoutEl) return;
		const workout = this.#workouts.find((work) => work.id === workoutEl.dataset.id);

		console.log(workoutEl);
		console.log(workout);

		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});
	}

	_setLocalStorage() {
		localStorage.setItem("workouts", JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem("workouts"));

		// link ulang prototype yang hilang karena di stringify awalnya (karena data menjadi objek biasa ketika di parse diatas, yang tidak punya prototype dari parent workout, cycling, running)
		// data.forEach((it) => (it.__proto__ = it.type === "running" ? Running.prototype : Cycling.prototype));

		//guard clause
		if (!data) return;

		//kita restore array workouts, samakan dengan local storage
		this.#workouts = data;

		this.#workouts.forEach((work) => this._renderWorkout(work));
	}

	reset() {
		localStorage.removeItem("workouts");
		location.reload();
	}
}

const app = new App();
