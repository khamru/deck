import { IScope, module } from 'angular';
import { compact, uniq, map } from 'lodash';
import { Subscription } from 'rxjs';

import { Application } from 'core/application/application.model';
import { IFilterTag, ISortFilter } from 'core/filterModel';
import { SecurityGroupState } from 'core/state';

export const SECURITY_GROUP_FILTER = 'securityGroup.filter.controller';

const ngmodule = module(SECURITY_GROUP_FILTER, [
  require('core/filterModel/dependentFilter/dependentFilter.service').name,
  require('./securityGroupDependentFilterHelper.service').name,
]);

export class SecurityGroupFilterCtrl {
  public app: Application;
  public accountHeadings: string[];
  public providerTypeHeadings: string[];
  public regionHeadings: string[];
  public sortFilter: ISortFilter;
  public stackHeadings: string[];
  public detailHeadings: string[];
  public tags: IFilterTag[];
  private groupsUpdatedSubscription: Subscription;
  private locationChangeUnsubscribe: () => void;

  constructor(
    private dependentFilterService: any,
    private securityGroupDependentFilterHelper: any,
    private $scope: IScope,
    private $rootScope: IScope,
  ) {
    'ngInject';
  }

  public $onInit(): void {
    const { $scope, $rootScope, app } = this;

    this.sortFilter = SecurityGroupState.filterModel.asFilterModel.sortFilter;
    this.tags = SecurityGroupState.filterModel.asFilterModel.tags;

    this.groupsUpdatedSubscription = SecurityGroupState.filterService.groupsUpdatedStream.subscribe(
      () => (this.tags = SecurityGroupState.filterModel.asFilterModel.tags),
    );

    this.initialize();
    app.securityGroups.onRefresh($scope, () => this.initialize());

    this.locationChangeUnsubscribe = $rootScope.$on('$locationChangeSuccess', () => {
      SecurityGroupState.filterModel.asFilterModel.activate();
      SecurityGroupState.filterService.updateSecurityGroups(app);
    });

    $scope.$on('$destroy', () => {
      this.groupsUpdatedSubscription.unsubscribe();
      this.locationChangeUnsubscribe();
    });
  }

  private updateSecurityGroups(applyParamsToUrl = true): void {
    const { dependentFilterService, securityGroupDependentFilterHelper, app } = this;

    const { account, region } = dependentFilterService.digestDependentFilters({
      sortFilter: SecurityGroupState.filterModel.asFilterModel.sortFilter,
      dependencyOrder: ['providerType', 'account', 'region'],
      pool: securityGroupDependentFilterHelper.poolBuilder(app.securityGroups.data),
    });

    this.accountHeadings = account;
    this.regionHeadings = region;

    if (applyParamsToUrl) {
      SecurityGroupState.filterModel.asFilterModel.applyParamsToUrl();
    }
  }

  private getHeadingsForOption(option: string): string[] {
    return compact(uniq(map(this.app.securityGroups.data, option) as string[])).sort();
  }

  public clearFilters(): void {
    SecurityGroupState.filterService.clearFilters();
    SecurityGroupState.filterService.updateSecurityGroups(this.app);
    this.updateSecurityGroups(false);
  }

  private initialize(): void {
    this.stackHeadings = ['(none)'].concat(this.getHeadingsForOption('stack'));
    this.detailHeadings = ['(none)'].concat(this.getHeadingsForOption('detail'));
    this.providerTypeHeadings = this.getHeadingsForOption('provider');
    this.updateSecurityGroups();
  }
}

ngmodule.component('securityGroupFilter', {
  templateUrl: require('./securityGroup.filter.component.html'),
  controller: SecurityGroupFilterCtrl,
  bindings: {
    app: '<',
  },
});
