import {Button, Form} from "react-bootstrap";
import {useRecoilState} from "recoil";
import {languageFamily, matchTemplateFamily, rewriteTemplateFamily, ruleFamily} from "../Playground/Playground.recoil";
import DirectorySelector, {DirectorySelection} from "../DirectorySelector/DirectorySelector";
import {useCallback, useState} from "react";
import {invoke} from "@tauri-apps/api/tauri";
import useToaster, {ToastVariant} from "../Toaster/useToaster";
import {useParams} from "react-router-dom";
import {FilesystemMatchResult, FilesystemResult, FilesystemResultType, FilesystemRewriteResult} from "./Filesystem.types";
import ResultsExplorer from "./ResultsExplorer";
import {CombyMatch, CombyRewrite} from "../Playground/Comby";
import {directorySelectionFamily} from "./Filesystem.recoil";
import {VSizable} from "../VSizable/VSizable";

const Filesystem = ({id}:{id:string})=> {
  const {push} = useToaster();
  const params = useParams() as {tabId: string};
  const [matchTemplate, setMatchTemplate] = useRecoilState(matchTemplateFamily(id));
  const [rewriteTemplate, setRewriteTemplate] = useRecoilState(rewriteTemplateFamily(id));
  const [rule, setRule] = useRecoilState(ruleFamily(id));
  const [language, setLanguage] = useRecoilState(languageFamily(id));
  const [directorySelection, setDirectorySelection] = useRecoilState<DirectorySelection>(directorySelectionFamily(id));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Array<CombyRewrite>|null>(null);

  const run = useCallback(async () => {
    console.log('invoking rpc', {matchTemplate, rewriteTemplate, rule, directorySelection, tabId: params.tabId});
    try {
      setLoading(true);
      const rewrite_args = {
          matchTemplate,
          rewriteTemplate,
          language,
          tabId: params.tabId,
          hostPath: directorySelection.expanded,
          extensions: [".md"],
          excludeDirs: ["node_modules"],
        };

      const results = await invoke<FilesystemResult>("filesystem_rewrite", rewrite_args);
      if(results.warning) {
        push('Rewriter Warning', results.warning, ToastVariant.warning)
      }
      setResult(results.result?.split("\n").map(r => {
        try {
          return JSON.parse(r)
        } catch (err) {
          return null;
        }
      }).filter(val => val) as Array<CombyRewrite>);
    } catch (error) {
      console.error(error);
      // @ts-ignore
      push('App Error', error?.message || error, ToastVariant.danger);
    } finally {
      setLoading(false);
    }
  }, [
    matchTemplate, rewriteTemplate, rule, directorySelection, params.tabId
  ]);

  const onSelect = useCallback((selected:DirectorySelection) => {
    setDirectorySelection(selected)
  }, [setDirectorySelection]);

  /* TODO:
      measure distance between bottom of run button and available height
      and set default height to match available space
  */

  return <VSizable defaultHeight={result ? 200 : 0} sizable={result ? <ResultsExplorer results={result} path={directorySelection.path}/> : null}>
      <div style={{padding: '1em 1em', height: '100%', overflowY: 'scroll'}}>
        <Form>
          <Form.Group className="mb-3" controlId="dirSelect">
              <Form.Label><strong><small>Directory</small></strong></Form.Label>
              <DirectorySelector defaultValue={directorySelection} onSelect={onSelect}/>
            </Form.Group>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '1em'}}>
            <Form.Group className="mb-3" controlId="matchTemplate">
              <Form.Label><strong><small>Match Template</small></strong></Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Match template" value={matchTemplate} onChange={e => setMatchTemplate(e.target.value)}/>
            </Form.Group>
            <Form.Group className="mb-3" controlId="rewriteTemplate">
              <Form.Label><strong><small>Rewrite Template</small></strong></Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Rewrite template" value={rewriteTemplate} onChange={e => setRewriteTemplate(e.target.value)}/>
            </Form.Group>
            <Form.Group className="mb-3" controlId="rule">
              <Form.Label><strong><small>Rule</small></strong></Form.Label>
              <Form.Control as="textarea" rows={1} placeholder="rule expression" value={rule} onChange={e => setRule(e.target.value)}/>
            </Form.Group>
          </div>
          <Button onClick={run} disabled={loading || !Boolean(directorySelection.expanded) || !Boolean(matchTemplate) || !Boolean(rewriteTemplate)}>Run</Button>
        </Form>
      </div>
    </VSizable>;
}
export default Filesystem;