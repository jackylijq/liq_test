import Link from "next/link";
import type { CSSProperties } from "react";
import {
  buildCategoryMaintenanceHref,
  canDeleteCategoryGroup,
  flattenExpandedCategoryGroups,
  getCategoryMaintenanceTree,
  type CategoryMaintenanceNode,
} from "@/lib/teacher/category-maintenance";
import { createCategoryAction, deleteCategoryAction, renameCategoryAction } from "./actions";

type TeacherCategoryMaintenanceContentProps = {
  expandedRootId?: string;
  error?: string;
};

const errorMessages: Record<string, string> = {
  "empty-name": "分类名称不能为空。",
  "duplicate-name": "同一级分类下已存在相同名称。",
  "has-children": "该分类下还有子分类，不能删除。",
  "has-terms": "该分类下已有学习内容，不能删除。",
};

export async function TeacherCategoryMaintenanceContent({ expandedRootId, error }: TeacherCategoryMaintenanceContentProps) {
  const tree = await getCategoryMaintenanceTree();
  const normalizedExpandedRootId = tree.some((group) => group.id === expandedRootId) ? expandedRootId : undefined;
  const expandedRows = flattenExpandedCategoryGroups(tree, normalizedExpandedRootId);

  return (
    <>
      <header className="teacher-header">
        <div>
          <p className="eyebrow">老师工作台</p>
          <h1>分类维护</h1>
        </div>
      </header>

      {error && errorMessages[error] ? <p className="form-error">{errorMessages[error]}</p> : null}

      <section className="category-maintenance-panel">
        <form action={createCategoryAction} className="category-create-form">
          <label htmlFor="root-category-name">新增一级分类</label>
          <input id="root-category-name" name="name" placeholder="例如：校本资料" />
          <button type="submit">新增</button>
        </form>

        <div className="category-maintenance-list">
          {tree.map((root) => (
            <section className="category-root-block" key={root.id}>
              <CategoryRow group={root} expandedRootId={normalizedExpandedRootId} isRoot />
              {normalizedExpandedRootId === root.id ? (
                <>
                  <form action={createCategoryAction} className="category-child-form">
                    <input name="parentId" type="hidden" value={root.id} />
                    <input name="expandedRootId" type="hidden" value={root.id} />
                    <label htmlFor={`child-category-${root.id}`}>新增下级分类</label>
                    <input id={`child-category-${root.id}`} name="name" placeholder="例如：Unit 1 Animal Friends" />
                    <button type="submit">新增</button>
                  </form>
                  {expandedRows.length > 0 ? (
                    <div className="category-child-list">
                      {expandedRows.map(({ group, depth }) => (
                        <CategoryRow depth={depth} expandedRootId={root.id} group={group} key={group.id} />
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">该一级分类下暂无子分类。</p>
                  )}
                </>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </>
  );
}

function CategoryRow({
  group,
  expandedRootId,
  depth = 0,
  isRoot = false,
}: {
  group: CategoryMaintenanceNode;
  expandedRootId?: string;
  depth?: number;
  isRoot?: boolean;
}) {
  const deletion = canDeleteCategoryGroup(group);
  const isExpanded = isRoot && expandedRootId === group.id;
  const expandHref = isExpanded ? buildCategoryMaintenanceHref() : buildCategoryMaintenanceHref({ expandedRootId: group.id });

  return (
    <div className="category-maintenance-row" style={{ "--category-depth": depth } as CSSProperties & Record<"--category-depth", number>}>
      <div className="category-row-main">
        {isRoot ? (
          <Link className="category-expand-link" href={expandHref}>
            {isExpanded ? "收起" : "展开"}
          </Link>
        ) : (
          <span className="category-depth-mark">下级</span>
        )}
        <div>
          <strong>{group.name}</strong>
          <span>
            子分类 {group.childrenCount} · 内容 {group.termLinkCount}
          </span>
        </div>
      </div>

      <div className="category-row-actions">
        <form action={renameCategoryAction} className="category-inline-form">
          <input name="id" type="hidden" value={group.id} />
          <input name="expandedRootId" type="hidden" value={expandedRootId ?? ""} />
          <input aria-label={`${group.name} 新名称`} defaultValue={group.name} name="name" />
          <button type="submit">改名</button>
        </form>

        <form action={createCategoryAction} className="category-inline-form">
          <input name="parentId" type="hidden" value={group.id} />
          <input name="expandedRootId" type="hidden" value={isRoot ? group.id : (expandedRootId ?? "")} />
          <input aria-label={`${group.name} 新增下级分类`} name="name" placeholder="新增下级" />
          <button type="submit">新增</button>
        </form>

        <form action={deleteCategoryAction}>
          <input name="id" type="hidden" value={group.id} />
          <input name="expandedRootId" type="hidden" value={expandedRootId ?? ""} />
          <button disabled={!deletion.canDelete} title={deletion.reason ?? "删除分类"} type="submit">
            删除
          </button>
        </form>
      </div>
    </div>
  );
}
