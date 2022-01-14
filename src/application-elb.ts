import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as  elasticloadbalancing from "aws-cdk-lib/aws-elasticloadbalancing";

import { ApplicationELBMetricFactory } from "./monitoring/aws/application-elb/metrics";
import { ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { IWatchful } from "./api";

export interface WatchAlbLoadBalancerOptions {
  /**
   * Threshold for the Cpu Maximum utilization
   *
   * @default 250
   */
  readonly activeConnectioCountThresholdPercent?: number;

  /**
   * Threshold for the Memory Maximum utilization.
   *
   * @default - 0 
   * ask adam for default =, maybe .8 or 1 .
   */
  readonly consumedLCUsThresholdPercent?: number;

  /**
   * Threshold for the Target Response Time.
   *
   * @default - 0.
   */
  readonly targetResponseTimeThreshold?: number;

  /**
   * Threshold for the Number of Requests.
   *
   * @default - 0.
   */
  readonly requestsThreshold?: number;

  /**
   * Threshold for the Number of Request Errors.
   *
   * @default - 0.
   */
  readonly requestsErrorRateThreshold?: number;
}

//is there a document for this? 


export interface WatchAlbLoadBalancerProps extends WatchAlbLoadBalancerOptions {
  readonly title: string;
  readonly watchful: IWatchful;
  readonly loadBalancer: elasticloadbalancing.LoadBalancer; 
  readonly targetGroup: ApplicationTargetGroup;
}

export class WatchAlb extends Construct {
  private readonly watchful: IWatchful;
  readonly targetGroup: ApplicationTargetGroup;
  readonly loadBalancer: elasticloadbalancing.LoadBalancer;
  private readonly targetGroupName: string;
  private readonly loadBalancerName: string;
  private readonly metrics: ApplicationELBMetricFactory;

  constructor(scope: Construct, id: string, props: WatchAlbLoadBalancerProps) {
    super(scope, id);

    this.watchful = props.watchful;
    this.targetGroup = props.targetGroup;
    this.targetGroupName = this.targetGroup.targetGroupFullName;
    this.loadBalancer = props.loadBalancer;
    this.loadBalancerName = this.targetGroup.firstLoadBalancerFullName;
    //this might not work 
    this.metrics = new ApplicationELBMetricFactory();

    this.watchful.addSection(props.title, {
      links: [
        {
          title: "Application ELB Load Balancer",
          url: linkForAlbLoadBalancer(this.loadBalancer),
        },
      ],
    });

    const { activeConnectionCountMetric, activeConnectionCountAlarm } =
      this.createActiveConnectionCountMonitor(
        props.activeConnectioCountThresholdPercent
      );
    const { consumedLCUsMetric, consumedLCUsAlarm } =
      this.createconsumedLCUsMonitor(props.consumedLCUsThresholdPercent);
    const { targetResponseTimeMetric, targetResponseTimeAlarm } =
      this.createTargetResponseTimeMonitor(props.targetResponseTimeThreshold);
    const { healthyHostsMetric, unhealthyHostsMetric } =
      this.createHostCountMetrics();
    const { requestsMetric, requestsAlarm } = this.createRequestsMonitor(
      props.requestsThreshold
    );
    const { http2xxMetric, http3xxMetric, http4xxMetric, http5xxMetric } =
      this.createHttpRequestsMetrics();
    const { requestsErrorRateMetric, requestsErrorRateAlarm } =
      this.requestsErrorRate(props.requestsErrorRateThreshold);

    this.watchful.addWidgets(
      new cloudwatch.GraphWidget({
        title: `ActiveConnectionCount/${activeConnectionCountMetric.period.toMinutes()}min`,
        width: 12,
        left: [activeConnectionCountMetric],
        leftAnnotations: [activeConnectionCountAlarm.toAnnotation()],
      }),
      new cloudwatch.GraphWidget({
        title: `ConsumedLCUs/${consumedLCUsMetric.period.toMinutes()}min`,
        width: 12,
        left: [consumedLCUsMetric],
        leftAnnotations: [consumedLCUsAlarm.toAnnotation()],
      })
    );
    this.watchful.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: "Healthy Hosts",
        height: 6,
        width: 6,
        metrics: [healthyHostsMetric],
      }),
      new cloudwatch.SingleValueWidget({
        title: "UnHealthy Hosts",
        height: 6,
        width: 6,
        metrics: [unhealthyHostsMetric],
      }),
      new cloudwatch.GraphWidget({
        title: `TargetResponseTime/${targetResponseTimeMetric.period.toMinutes()}min`,
        width: 6,
        left: [targetResponseTimeMetric],
        leftAnnotations: [targetResponseTimeAlarm.toAnnotation()],
      }),
      new cloudwatch.GraphWidget({
        title: `Requests/${requestsMetric.period.toMinutes()}min`,
        width: 6,
        left: [requestsMetric],
        leftAnnotations: [requestsAlarm.toAnnotation()],
      })
    );
    this.watchful.addWidgets(
      new cloudwatch.GraphWidget({
        title: "HTTP Requests Overview",
        width: 12,
        left: [http2xxMetric, http3xxMetric, http4xxMetric, http5xxMetric],
      }),
      new cloudwatch.GraphWidget({
        title: `HTTP Requests Error rate/${requestsErrorRateMetric.period.toMinutes()}min`,
        width: 12,
        left: [requestsErrorRateMetric],
        leftAnnotations: [requestsErrorRateAlarm.toAnnotation()],
      })
    );
  }

  private createActiveConnectionCountMonitor(
    activeConnectioCountThresholdPercent = 0
  ) {
    const activeConnectionCountMetric =
      this.metrics.metricActiveConnectionCount(this.loadBalancerName);
    const activeConnectionCountAlarm = activeConnectionCountMetric.createAlarm(
      this,
      "activeConnectionCountAlarm",
      {
        alarmDescription: "activeConnectionCountAlarm",
        threshold: activeConnectioCountThresholdPercent,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 3,
      }
    );
    this.watchful.addAlarm(activeConnectionCountAlarm);
    return { activeConnectionCountMetric, activeConnectionCountAlarm };
  }

  private createconsumedLCUsMonitor(consumedLCUsThresholdPercent = 0) {
    const consumedLCUsMetric = this.metrics.metricConsumedLCUs(
      this.loadBalancerName
    );
    const consumedLCUsAlarm = consumedLCUsMetric.createAlarm(
      this,
      "consumedLCUsAlarm",
      {
        alarmDescription: "consumedLCUsAlarm",
        threshold: consumedLCUsThresholdPercent,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 3,
      }
    );
    this.watchful.addAlarm(consumedLCUsAlarm);
    return { consumedLCUsMetric, consumedLCUsAlarm };
  }

  private createTargetResponseTimeMonitor(targetResponseTimeThreshold = 0) {
    const targetResponseTimeMetric = this.metrics.metricTargetResponseTime(
      this.targetGroupName,
      this.loadBalancerName
    ).avg;
    const targetResponseTimeAlarm = targetResponseTimeMetric.createAlarm(
      this,
      "targetResponseTimeAlarm",
      {
        alarmDescription: "targetResponseTimeAlarm",
        threshold: targetResponseTimeThreshold,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 3,
      }
    );
    this.watchful.addAlarm(targetResponseTimeAlarm);
    return { targetResponseTimeMetric, targetResponseTimeAlarm };
  }

  private createRequestsMonitor(requestsThreshold = 0) {
    const requestsMetric = this.metrics.metricRequestCount(
      this.targetGroupName,
      this.loadBalancerName
    );
    const requestsAlarm = requestsMetric.createAlarm(this, "requestsAlarm", {
      alarmDescription: "requestsAlarm",
      threshold: requestsThreshold,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
    });
    this.watchful.addAlarm(requestsAlarm);
    return { requestsMetric, requestsAlarm };
  }

  private createHttpRequestsMetrics() {
    const metrics = this.metrics.metricHttpStatusCodeCount(
      this.targetGroupName,
      this.loadBalancerName
    );
    const http2xxMetric = metrics.count2XX;
    const http3xxMetric = metrics.count3XX;
    const http4xxMetric = metrics.count4XX;
    const http5xxMetric = metrics.count5XX;
    return { http2xxMetric, http3xxMetric, http4xxMetric, http5xxMetric };
  }

  private createHostCountMetrics() {
    const healthyHostsMetric = this.metrics.metricMinHealthyHostCount(
      this.targetGroupName,
      this.loadBalancerName
    );
    const unhealthyHostsMetric = this.metrics.metricMaxUnhealthyHostCount(
      this.targetGroupName,
      this.loadBalancerName
    );
    return { healthyHostsMetric, unhealthyHostsMetric };
  }

  private requestsErrorRate(requestsErrorRateThreshold = 0) {
    const requestsErrorRateMetric = this.metrics.metricHttpErrorStatusCodeRate(
      this.targetGroupName,
      this.loadBalancerName
    );
    const requestsErrorRateAlarm = requestsErrorRateMetric.createAlarm(
      this,
      "requestsErrorRateAlarm",
      {
        alarmDescription: "requestsErrorRateAlarm",
        threshold: requestsErrorRateThreshold,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 3,
      }
    );
    this.watchful.addAlarm(requestsErrorRateAlarm);
    return { requestsErrorRateMetric, requestsErrorRateAlarm };
  }
}

function linkForAlbLoadBalancer(loadBalancer: string) {
  return `https://console.aws.amazon.com/ec2/v2/home?region=${loadBalancer.stack.region}#LoadBalancers:sort=${loadBalancer.loadBalancerName}`;
}
//https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/ecs-node-app-bluegrean/services/ecs-node-app-bluegrean-service/details
//where to get link 

//https://console.aws.amazon.com/ec2/v2/home?region=${loadBalancer.stack.region}#LoadBalancers:sort=${loadBalancer.loadBalancerName}