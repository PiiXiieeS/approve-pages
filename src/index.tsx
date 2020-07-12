import ForgeUI, { 
  Button,
  ButtonSet,
  ConfigForm,
  DateLozenge,
  Fragment,
  Macro,
  Option, 
  Select,
  SectionMessage,
  StatusLozenge,
  Table, Head, Row, Cell,
  Text,
  TextField, 
  render,
  useConfig,
  useProductContext,
  useState,
  UserPicker
} from '@forge/ui';
import api from '@forge/api';
export type Appearance = 'info' | 'warning' | 'confirmation' | 'error';

const RENDER = {
  ERROR: 0,
  STATE: 1,
  APPROVALS: 2
}

const STATE = {
  DRAFT: { title: 'Draft', text: 'This version has not been sent for review', appearance: 'info' as Appearance },
  REVIEW: { title: 'In Review', text: 'This version is in review', appearance: 'warning' as Appearance },
  APPROVED: { title: 'Approved', text: 'This version has been approved', appearance: 'confirmation' as Appearance },
  REJECTED: { title: 'Rejected', text: 'This version has been rejected', appearance: 'error' as Appearance }
};

const equalState = (state1:any, state2:any) => {
  return state1.title === state2.title;
};

const equalRender = (render1:number, render2:number) => {
  return render1 === render2;
};

const hasIssues = (contentIssues:any) => {
  return contentIssues && contentIssues.issues.length > 0;
};

const fetchProjects = async () => {
  const response = await api.asApp().requestJira("/rest/api/3/project");
  return response.json();
};

const fetchIssueTypes = async () => {
  const response = await api.asApp().requestJira("/rest/api/3/issuetype");
  const issueTypes = await response.json();
  return issueTypes.filter(issueType => !issueType.subtask);
};

const Config = () => {
  const [ projects ] = useState(fetchProjects);
  const [ issueTypes ] = useState(fetchIssueTypes);

  return (
    <ConfigForm>
      <Select label="Project" name="projectKey" isRequired>
        {projects.map(project => {
          return (
            <Option label={`${project.name} (${project.key})`} value={project.key} />
          )
        })}
      </Select>
      <Select label="Issue type" name="issueTypeId" isRequired>
        {issueTypes.map(issueType => {
          return (
            <Option label={issueType.name} value={issueType.id} />
          )
        })}
      </Select>
      <TextField label="Approved status" name="approved" defaultValue="Approved" description="Name of the workflow status considered as Approved" isRequired/>
      <TextField label="Rejected status" name="rejected" defaultValue="Rejected" description="Name of the workflow status considered as Rejected" isRequired/>
      <TextField label="Show reviews" name="maxReviews" defaultValue="50" description="Maximum number of reviews displayed" isRequired/>
      <UserPicker label="Assign reviews to" name="assignee" />
    </ConfigForm>
  )
};

const App = () => {
  const config = useConfig();
  const [ render, setRender ] = useState(config ? RENDER.STATE : RENDER.ERROR);
  const [ errorMessage, setErrorMessage ] = useState("This app requires configuration before use.");
  const { contentId } = useProductContext();
  const [ content ] = useState(fetchContent);
  const [ contentVersion ] = useState(content ? content.version.number : 1);
  const [ contentIssues, setContentIssues ] = useState(fetchContentIssues);
  const [ state, setState ] = useState(getContentState);

  return (
    <Fragment>
      { equalRender(render, RENDER.ERROR) && renderError() }
      { equalRender(render, RENDER.STATE) && renderState() }
      { equalRender(render, RENDER.APPROVALS) && renderApprovals() }
    </Fragment>
  );

  function renderError() {
    return (
      <SectionMessage title="Approve Pages" appearance="error">
        <Text>{errorMessage || 'Something went wrong. Is the app configured correctly?'}</Text>
      </SectionMessage>
    );
  }

  function renderState() {
    return (
      <Fragment>
        <SectionMessage title={`${state.title} (v. ${contentVersion})`} appearance={state.appearance}>
          <Text>{state.text}</Text>
        </SectionMessage>
        <ButtonSet>
          <Button text="Send for review" onClick={async () => { await createIssue() }} disabled={!equalState(state, STATE.DRAFT)} /> 
          <Button text="Show reviews" onClick={() => { setRender(RENDER.APPROVALS) }} disabled={!hasIssues(contentIssues)} />
        </ButtonSet>
      </Fragment>
    );
  }

  function renderApprovals() {
    return (
      <Fragment>
        <Table rowsPerPage={10}>
          <Head>
            <Cell>
              <Text content="Summary" />
            </Cell>
            <Cell>
              <Text content="Created" />
            </Cell>
            <Cell>
              <Text content="Updated" />
            </Cell>
            <Cell>
              <Text content="Status" />
            </Cell>
          </Head>
          {contentIssues.issues.map( issue => (
            <Row>
            <Cell>
              <Text>[{issue.fields.summary}]({`/browse/${issue.key}`})</Text>
            </Cell>
            <Cell>
              <Text>
                <DateLozenge value={new Date(issue.fields.created).getTime()} />
              </Text>
            </Cell>
            <Cell>
              <Text>
                <DateLozenge value={new Date(issue.fields.updated).getTime()} />
              </Text>
            </Cell>
            <Cell>
              <Text>
                <StatusLozenge text={issue.fields.status.name} appearance={getStatusNameAppearance(issue.fields.status.name)} />
              </Text>
            </Cell>
          </Row>
          ))}
        </Table>
        <Button text="<- View status" onClick={() => { setRender(RENDER.STATE) }} />
      </Fragment>
    );
  }

  function getContentState() {
    if (!hasIssues(contentIssues)) return STATE.DRAFT;
    const issue = contentIssues.issues.find(isContentIssue);
    
    if (issue) {
      if (issue.fields.status.name === (config.approved || 'Approved')) return STATE.APPROVED;
      if (issue.fields.status.name === (config.rejected || 'Rejected')) return STATE.REJECTED;
      return STATE.REVIEW;
    }
    return STATE.DRAFT;
  }

  function isContentIssue(issue: any) {
    if (!content) {
      console.error('isContentIssue()', 'content is not defined')
      return false;
    }
    return issue.fields.summary === `${content.title} (v. ${contentVersion})`;
  }

  function getStatusNameAppearance(statusName:string) {
    if (!config) return "default";
    switch (statusName) {
      case config.approved:
        return "success";
      case config.rejected:
        return "removed";
      default:
        return "inprogress";
    }
  };

  async function fetchContent() {
    if (!contentId) return null;

    const response = await api.asApp().requestConfluence(`/wiki/rest/api/content/${contentId}`);
    const responseBody = await response.json();
    if (!response.ok) {
      console.error('fetchContent()', responseBody);
      setErrorMessage(null);
      setRender(RENDER.ERROR);
      return null;
    }
    return responseBody;
  };

  async function fetchContentIssues() {
    if (!content || !config) return null;
    const response = await api.asApp().requestJira(`/rest/api/3/search`, ({
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "jql": `project = "${config.projectKey}" AND summary ~ "${content.title}" ORDER BY createdDate DESC`,
        "maxResults": config.maxReviews
      })
    }))
    const responseBody = await response.json();
    if (!response.ok) {
      console.error('fetchContentIssues()', responseBody);
      setErrorMessage('Something went wrong while fetching issues. Do you have access to the configured project?');
      setRender(RENDER.ERROR);
      return null;
    }
    return responseBody;
  };

  async function createIssue() {
    const descriptionContent = [{
      "type": "paragraph",
      "content": [{
          "type": "emoji",
          "attrs": {
            "shortName": ":check_mark:",
            "text": ":check_mark:"
          }
        },
        { "type": "text", "text": " " },
        {
          "type": "text",
          "text": "View latest version",
          "marks": [
            {
              "type": "link",
              "attrs": {
                "href": `/wiki${content._links.webui}`,
                "title": "View latest version"
              }
            }
          ]
        }]
    }];
    // No diff available for version 1
    if (contentVersion > 1) {
      descriptionContent.push({
        "type": "paragraph",
        "content": [
          {
            "type": "emoji",
            "attrs": {
              "shortName": ":question_mark:",
              "text": ":question_mark:"
            }
          },
          { "type": "text", "text": " " },
          {
            "type": "text",
            "text": "View what's changed",
            "marks": [
              {
                "type": "link",
                "attrs": {
                  "href": `/wiki/pages/diffpagesbyversion.action?pageId=${content.id}&originalVersion=${contentVersion-1}&revisedVersion=${contentVersion}`,
                  "title": "View what's changed"
                }
              }
            ]
          }
        ]
      });
    }
    const response = await api.asApp().requestJira("/rest/api/3/issue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          project: {
            key: config.projectKey
          },
          issuetype: {
            id: config.issueTypeId
          },
          assignee: {
            id: config.assignee
          },
          summary: `${content.title} (v. ${contentVersion})`,
          description: {
            "type": "doc",
            "version": 1,
            "content": descriptionContent
          }
        }
      })
    });
    const responseBody = await response.json();

    if (!response.ok) {
      console.error('createIssue()', responseBody);
      setErrorMessage('Something went wrong while creating new issue. Do you have access to the configured project?');
      setRender(RENDER.ERROR);
    } else {
      setState(STATE.REVIEW);
      // reload content issues to get the one we just created
      setContentIssues(await fetchContentIssues());
    }
  };
};

export const run = render(<Macro app={<App />} config={<Config />}/>);