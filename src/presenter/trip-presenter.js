import {remove, render} from '../framework/render';
import TripListView from '../view/trip-list-view';
import SortView from '../view/sort-view';
import EmptyListView from '../view/empty-list-view';
import PointPresenter from './point-presenter';
import {filters, sorts} from '../utils/util';
import {FiltersTypes, SortTypes, UpdateType, UserAction} from '../utils/consts';
import NewPointPresenter from './new-point-presenter';


export default class TripPresenter {
  #container = null;
  #pointsModel = null;
  #filterModel = null;

  #tripListComponent = new TripListView();
  #pointPresenters = new Map();
  #newPointPresenter = null;
  #sortComponent = new SortView();
  #currentSortType = SortTypes.DAY;
  #currentFilterType = FiltersTypes.EVERYTHING;
  #emptyListComponent = null;
  constructor(container, pointsModel, filterModel, onNewPointDestroy) {
    this.#container = container;
    this.#pointsModel = pointsModel;
    this.#filterModel = filterModel;

    this.#newPointPresenter = new NewPointPresenter(this.#container, this.#pointsModel, this.#handleViewAction, onNewPointDestroy);

    this.#pointsModel.addObserver(this.#handleModelEvent);
    this.#filterModel.addObserver(this.#handleModelEvent);
  }

  get points() {
    this.#currentFilterType = this.#filterModel.filter;
    const points = this.#pointsModel.points;
    const filteredPoints = filters[this.#currentFilterType](points);
    return sorts[this.#currentSortType](filteredPoints);
  }

  init() {
    this.#renderTrip();
  }

  createTask = () => {
    this.#currentSortType = SortTypes.DAY;
    this.#filterModel.setFilter(UpdateType.MAJOR, FiltersTypes.EVERYTHING);
    this.#newPointPresenter.init();
  }

  #clearTrip = (resetSortType = false) => {
    this.#newPointPresenter.destroy();
    this.#pointPresenters.forEach((presenter) => presenter.destroy());
    this.#pointPresenters.clear();

    remove(this.#sortComponent);
    if (this.#emptyListComponent) {
      remove(this.#emptyListComponent);
    }

    if (resetSortType) {
      this.#currentSortType = SortTypes.DAY;
    }
  }

  #handleViewAction = (actionType, updateType, update) => {
    switch (actionType) {
      case UserAction.UPDATE_POINT:
        this.#pointsModel.updatePoint(updateType, update);
        break;
      case UserAction.ADD_POINT:
        this.#pointsModel.addPoint(updateType, update);
        break;
      case UserAction.DELETE_POINT:
        this.#pointsModel.deletePoint(updateType, update);
        break;
    }
  }

  #handleModelEvent = (updateType, data) => {
    switch (updateType) {
      case UpdateType.PATCH:
        this.#pointPresenters.get(data.id).init(data);
        break;
      case UpdateType.MINOR:
        this.#clearTrip();
        this.#renderTrip();
        break;
      case UpdateType.MAJOR:
        this.#clearTrip(false);
        this.#renderTrip();
        break;
    }
  }

  #handleSortTypeChange = (sortType) => {
    if (this.#currentSortType === sortType) {
      return;
    }
    this.#currentSortType = sortType;
    this.#clearTrip();
    this.#renderTrip();
  }

  #renderPoint = (point) => {
    const pointPresenter = new PointPresenter(this.#tripListComponent.element, this.#pointsModel, this.#handleViewAction, this.#handleModelEvent);
    pointPresenter.init(point);
    this.#pointPresenters.set(point.id, pointPresenter);
  }

  #renderPoints = () => {
    this.points.forEach((point) => {
      this.#renderPoint(point);
    });
  }

  #renderSort = () => {
    this.#sortComponent = new SortView(this.#currentSortType);
    render(this.#sortComponent, this.#container);
    this.#sortComponent.setSortTypeChangeHandler(this.#handleSortTypeChange);
  }

  #renderEmptyList = () => {
    this.#emptyListComponent = new EmptyListView(this.#currentFilterType);
    render(this.#emptyListComponent, this.#container);
  }

  #renderTrip = () => {
    if (this.points.length === 0) {
      this.#renderEmptyList();
      return;
    }
    this.#renderSort();
    render(this.#tripListComponent, this.#container);
    this.#renderPoints();
  }
}
